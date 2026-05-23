import { createTrustLayerClient } from "@render/trustlayer-sdk";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, requireAdmin, requireAuthUser, requireModerator, requireSuperAdmin } from "../auth/middleware.js";
import { writeAuditLog } from "../audit/log.js";
import { prisma } from "../database/client.js";
import { createRenderQueue, RENDER_QUEUE_NAMES, type NotificationReplayRequestJobData } from "@render/queue";
import { createRenderEvent, RENDER_EVENT_TYPES } from "@render/events";
import { recordOperationalMetric } from "@render/observability";
import { requireAdminOrganizationScope } from "./scope.js";

const idParamsSchema = z.object({
  id: z.string().uuid()
});

const suspendUserSchema = z.object({
  reason: z.string().min(3).max(500),
  moderationNotes: z.string().max(2000).optional()
});

const rejectListingSchema = z.object({
  reason: z.string().min(3).max(500)
});



const disputeResolutionSchema = z.object({
  resolutionNote: z.string().min(10).max(2000)
});

function getTrustLayerClient() {
  const apiKey = process.env.TRUSTLAYER_API_KEY;
  const baseUrl = process.env.TRUSTLAYER_API_URL;

  if (!apiKey || !baseUrl) {
    throw new Error("TrustLayer dispute resolution credentials are required.");
  }

  return createTrustLayerClient({
    apiKey,
    baseUrl,
    maxRetries: 3,
    timeoutMs: 10_000
  });
}

const disputeNoteSchema = z.object({
  note: z.string().min(3).max(2000)
});

const disputeStatusSchema = z.object({
  status: z.enum([
    "UNDER_REVIEW",
    "NEEDS_BUYER_RESPONSE",
    "NEEDS_SELLER_RESPONSE"
  ]),
  note: z.string().max(2000).optional()
});

const deadLetterListQuerySchema = z.object({
  status: z.enum(["waiting", "delayed", "failed", "completed"]).default("waiting"),
  take: z.coerce.number().int().min(1).max(100).default(50)
});

const disputeListQuerySchema = z.object({
  status: z.enum([
    "OPEN",
    "UNDER_REVIEW",
    "NEEDS_BUYER_RESPONSE",
    "NEEDS_SELLER_RESPONSE",
    "RESOLVED_BUYER_REFUND",
    "RESOLVED_SELLER_RELEASE",
    "CANCELLED"
  ]).optional()
});

export async function registerAdminRoutes(app: FastifyInstance): Promise<void> {
  app.post("/admin/notifications/dead-letter/:id/replay-request", { preHandler: [authenticate, requireSuperAdmin] }, async (request, reply) => {
    const authUser = requireAuthUser(request);
    const params = idParamsSchema.safeParse(request.params);
    const body = z.object({ reason: z.string().min(10).max(1000) }).safeParse(request.body);

    if (!params.success || !body.success) {
      return reply.code(400).send({ error: "Invalid notification replay request payload." });
    }

    const manualApproval = true;
    const automaticReplay = false;
    const replayMode = "MANUAL_OPERATOR_REVIEW_REQUIRED";

    const deadLetterQueue = createRenderQueue(RENDER_QUEUE_NAMES.notificationDeadLetter);
    const deadLetterJob = await deadLetterQueue.getJob(params.data.id);
    await deadLetterQueue.close();

    if (!deadLetterJob) {
      const blockedEvent = createRenderEvent({
        id: crypto.randomUUID(),
        type: RENDER_EVENT_TYPES.notificationReplayBlocked,
        aggregateId: params.data.id,
        correlationId: crypto.randomUUID(),
        source: "render.api",
        payload: {
          deadLetterJobId: params.data.id,
          status: "BLOCKED",
          reason: "DEAD_LETTER_JOB_NOT_FOUND",
          manualApproval,
          automaticReplay,
          replayMode
        }
      });

      recordOperationalMetric({
        name: "notification.replay.blocked",
        value: 1,
        unit: "count",
        correlationId: blockedEvent.correlationId,
        aggregateId: params.data.id,
        source: "render.api",
        metadata: { blockedEvent }
      });

      void writeAuditLog({
        request,
        actorUserId: authUser.userId,
        action: "NOTIFICATION_DEAD_LETTER_REPLAY_BLOCKED",
        entityType: "NOTIFICATION_DEAD_LETTER",
        entityId: params.data.id,
        metadata: {
          reason: "DEAD_LETTER_JOB_NOT_FOUND",
          blockedEvent: {
            id: blockedEvent.id,
            type: blockedEvent.type,
            correlationId: blockedEvent.correlationId,
            occurredAt: blockedEvent.occurredAt
          },
          manualApproval,
          automaticReplay,
          replayMode
        }
      });

      return reply.code(404).send({ error: "Notification dead-letter job not found." });
    }

    const data = deadLetterJob.data;
    const replayRequest: NotificationReplayRequestJobData = {
      deadLetterJobId: String(deadLetterJob.id ?? params.data.id),
      originalQueue: data.originalQueue,
      userId: data.userId,
      title: data.title,
      body: data.body,
      approvedByUserId: authUser.userId,
      reason: body.data.reason,
      requestedAt: new Date().toISOString(),
      idempotencyKey: `notification-replay:${deadLetterJob.id}:${authUser.userId}`,
      correlationId: data.correlationId
    };

    const replayQueue = createRenderQueue(RENDER_QUEUE_NAMES.notificationReplayRequest);
    const replayJob = await replayQueue.add("notification-replay-request", replayRequest, {
      jobId: replayRequest.idempotencyKey
    });
    await replayQueue.close();

    const requestedEvent = createRenderEvent({
      id: crypto.randomUUID(),
      type: RENDER_EVENT_TYPES.notificationReplayRequested,
      aggregateId: data.userId,
      correlationId: data.correlationId,
      source: "render.api",
      payload: {
        deadLetterJobId: replayRequest.deadLetterJobId,
        replayJobId: String(replayJob.id ?? ""),
        userId: data.userId,
        status: "REPLAY_REQUESTED",
        manualApproval,
        automaticReplay,
        replayMode,
        idempotencyKey: replayRequest.idempotencyKey
      }
    });

    recordOperationalMetric({
      name: "notification.replay.requested",
      value: 1,
      unit: "count",
      correlationId: data.correlationId,
      aggregateId: data.userId,
      source: "render.api",
      metadata: { requestedEvent }
    });

    void writeAuditLog({
      request,
      actorUserId: authUser.userId,
      action: "NOTIFICATION_DEAD_LETTER_REPLAY_REQUESTED",
      entityType: "NOTIFICATION_DEAD_LETTER",
      entityId: replayRequest.deadLetterJobId,
      metadata: {
        replayJobId: String(replayJob.id ?? ""),
        idempotencyKey: replayRequest.idempotencyKey,
        manualApproval,
        automaticReplay,
        replayMode,
        reason: body.data.reason,
        requestedEvent: {
          id: requestedEvent.id,
          type: requestedEvent.type,
          correlationId: requestedEvent.correlationId,
          occurredAt: requestedEvent.occurredAt
        },
        deadLetterJobId: replayRequest.deadLetterJobId,
        userId: data.userId,
        originalQueue: data.originalQueue
      }
    });

    return reply.code(202).send({
      replayRequested: true,
      replayJobId: replayJob.id,
      deadLetterJobId: replayRequest.deadLetterJobId,
      manualApproval,
      automaticReplay,
      replayMode,
      idempotencyKey: replayRequest.idempotencyKey
    });
  });

  app.get("/admin/users", { preHandler: [authenticate, requireAdmin] }, async (request) => {
    const authUser = requireAuthUser(request);

    const users = await prisma.user.findMany({
      select: {
        id: true,
        phone: true,
        email: true,
        role: true,
        verificationLevel: true,
        trustScore: true,
        trustTier: true,
        isBusiness: true,
        isSuspended: true,
        suspendedAt: true,
        suspendedReason: true,
        createdAt: true
      },
      orderBy: { createdAt: "desc" },
      take: 100
    });

    void writeAuditLog({
      request,
      actorUserId: authUser.userId,
      action: "ADMIN_USERS_VIEWED",
      entityType: "USER"
    });

    return { users };
  });

  app.post("/admin/users/:id/suspend", { preHandler: [authenticate, requireAdmin] }, async (request, reply) => {
    const authUser = requireAuthUser(request);
    const params = idParamsSchema.safeParse(request.params);
    const body = suspendUserSchema.safeParse(request.body);

    if (!params.success || !body.success) {
      return reply.code(400).send({ error: "Invalid user suspension payload." });
    }

    if (params.data.id === authUser.userId) {
      return reply.code(400).send({ error: "Admins cannot suspend their own account." });
    }

    const user = await prisma.user.update({
      where: { id: params.data.id },
      data: {
        isSuspended: true,
        suspendedAt: new Date(),
        suspendedReason: body.data.reason,
        moderationNotes: body.data.moderationNotes
      },
      select: {
        id: true,
        phone: true,
        role: true,
        isSuspended: true,
        suspendedAt: true,
        suspendedReason: true
      }
    });

    void writeAuditLog({
      request,
      actorUserId: authUser.userId,
      action: "ADMIN_USER_SUSPENDED",
      entityType: "USER",
      entityId: user.id,
      metadata: { reason: body.data.reason }
    });

    return { user };
  });

  app.post("/admin/users/:id/unsuspend", { preHandler: [authenticate, requireAdmin] }, async (request, reply) => {
    const authUser = requireAuthUser(request);
    const params = idParamsSchema.safeParse(request.params);

    if (!params.success) {
      return reply.code(400).send({ error: "Invalid user ID." });
    }

    const user = await prisma.user.update({
      where: { id: params.data.id },
      data: {
        isSuspended: false,
        suspendedAt: null,
        suspendedReason: null
      },
      select: {
        id: true,
        phone: true,
        role: true,
        isSuspended: true
      }
    });

    void writeAuditLog({
      request,
      actorUserId: authUser.userId,
      action: "ADMIN_USER_UNSUSPENDED",
      entityType: "USER",
      entityId: user.id
    });

    return { user };
  });

  app.get("/admin/listings/pending", { preHandler: [authenticate, requireModerator] }, async (request, reply) => {
    const scope = await requireAdminOrganizationScope(request, reply);
    if (!scope) return;

    const listings = await prisma.listing.findMany({
      where: {
        status: { in: ["PENDING", "MANUAL_REVIEW"] },
        deletedAt: null,
        ...(scope.organizationId ? { organizationId: scope.organizationId } : {})
      },
      include: {
        images: true,
        seller: {
          select: {
            id: true,
            phone: true,
            verificationLevel: true,
            trustScore: true,
            trustTier: true,
            isSuspended: true
          }
        }
      },
      orderBy: { createdAt: "asc" },
      take: 100
    });

    return { listings };
  });

  app.post("/admin/listings/:id/approve", { preHandler: [authenticate, requireModerator] }, async (request, reply) => {
    const authUser = requireAuthUser(request);
    const params = idParamsSchema.safeParse(request.params);

    if (!params.success) {
      return reply.code(400).send({ error: "Invalid listing ID." });
    }

    const scope = await requireAdminOrganizationScope(request, reply);
    if (!scope) return;

    const existingListing = await prisma.listing.findFirst({
      where: {
        id: params.data.id,
        ...(scope.organizationId ? { organizationId: scope.organizationId } : {})
      }
    });

    if (!existingListing) {
      return reply.code(404).send({ error: "Listing not found." });
    }

    const listing = await prisma.listing.update({
      where: { id: existingListing.id },
      data: { status: "LIVE" }
    });

    void writeAuditLog({
      request,
      actorUserId: authUser.userId,
      action: "ADMIN_LISTING_APPROVED",
      entityType: "LISTING",
      entityId: listing.id
    });

    return { listing };
  });

  app.post("/admin/listings/:id/reject", { preHandler: [authenticate, requireModerator] }, async (request, reply) => {
    const authUser = requireAuthUser(request);
    const params = idParamsSchema.safeParse(request.params);
    const body = rejectListingSchema.safeParse(request.body);

    if (!params.success || !body.success) {
      return reply.code(400).send({ error: "Invalid listing rejection payload." });
    }

    const scope = await requireAdminOrganizationScope(request, reply);
    if (!scope) return;

    const existingListing = await prisma.listing.findFirst({
      where: {
        id: params.data.id,
        ...(scope.organizationId ? { organizationId: scope.organizationId } : {})
      }
    });

    if (!existingListing) {
      return reply.code(404).send({ error: "Listing not found." });
    }

    const listing = await prisma.listing.update({
      where: { id: existingListing.id },
      data: { status: "REJECTED" }
    });

    void writeAuditLog({
      request,
      actorUserId: authUser.userId,
      action: "ADMIN_LISTING_REJECTED",
      entityType: "LISTING",
      entityId: listing.id,
      metadata: { reason: body.data.reason }
    });

    return { listing };
  });

  app.get("/admin/safe-deals/disputed", { preHandler: [authenticate, requireModerator] }, async (request, reply) => {
    const scope = await requireAdminOrganizationScope(request, reply);
    if (!scope) return;

    const safeDeals = await prisma.safeDeal.findMany({
      where: { status: "DISPUTED", ...(scope.organizationId ? { organizationId: scope.organizationId } : {}) },
      include: {
        listing: true,
        buyer: {
          select: { id: true, phone: true, email: true, trustScore: true, trustTier: true }
        },
        seller: {
          select: { id: true, phone: true, email: true, trustScore: true, trustTier: true }
        }
      },
      orderBy: { updatedAt: "desc" },
      take: 100
    });

    return { safeDeals };
  });



  app.get("/admin/notifications/dead-letter", { preHandler: [authenticate, requireSuperAdmin] }, async (request, reply) => {
    const authUser = requireAuthUser(request);
    const parsed = deadLetterListQuerySchema.safeParse(request.query);

    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid dead-letter query." });
    }

    const queue = createRenderQueue(RENDER_QUEUE_NAMES.notificationDeadLetter);

    try {
      const jobs = await queue.getJobs([parsed.data.status], 0, parsed.data.take - 1, false);
      const deadLetters = jobs.map((job) => ({
        id: String(job.id ?? ""),
        queue: RENDER_QUEUE_NAMES.notificationDeadLetter,
        status: parsed.data.status,
        payload: job.data,
        attemptsMade: job.attemptsMade,
        failedReason: job.failedReason,
        timestamp: job.timestamp,
        processedOn: job.processedOn,
        finishedOn: job.finishedOn,
        replayReady: true,
        replayMode: "MANUAL_OPERATOR_REVIEW_REQUIRED"
      }));

      void writeAuditLog({
        request,
        actorUserId: authUser.userId,
        action: "ADMIN_NOTIFICATION_DEAD_LETTERS_VIEWED",
        entityType: "NOTIFICATION_DEAD_LETTER",
        metadata: {
          queue: RENDER_QUEUE_NAMES.notificationDeadLetter,
          status: parsed.data.status,
          count: deadLetters.length,
          replayMode: "MANUAL_OPERATOR_REVIEW_REQUIRED"
        }
      });

      return {
        summary: {
          queue: RENDER_QUEUE_NAMES.notificationDeadLetter,
          status: parsed.data.status,
          count: deadLetters.length,
          replayEnabled: false,
          replayMode: "MANUAL_OPERATOR_REVIEW_REQUIRED"
        },
        deadLetters
      };
    } finally {
      await queue.close();
    }
  });

  app.get("/admin/finance/reconciliation", { preHandler: [authenticate, requireSuperAdmin] }, async (request) => {
    const authUser = requireAuthUser(request);

    const [
      failedSettlements,
      retryableSettlements,
      processingSettlements,
      orphanReadySettlements,
      duplicateReleaseEntries
    ] = await Promise.all([
      prisma.settlement.findMany({
        where: { status: "FAILED" },
        include: { safeDeal: true },
        orderBy: { updatedAt: "desc" },
        take: 100
      }),
      prisma.settlement.findMany({
        where: {
          status: "FAILED",
          OR: [
            { nextRetryAt: null },
            { nextRetryAt: { lte: new Date() } }
          ]
        },
        include: { safeDeal: true },
        orderBy: { updatedAt: "asc" },
        take: 100
      }),
      prisma.settlement.findMany({
        where: { status: "PROCESSING" },
        include: { safeDeal: true },
        orderBy: { updatedAt: "asc" },
        take: 100
      }),
      prisma.settlement.findMany({
        where: {
          status: "READY",
          safeDeal: {
            status: { not: "CONFIRMED" }
          }
        },
        include: { safeDeal: true },
        orderBy: { updatedAt: "desc" },
        take: 100
      }),
      prisma.escrowLedgerEntry.groupBy({
        by: ["safeDealId", "entryType"],
        where: { entryType: "SETTLEMENT_RELEASE" },
        _count: { id: true },
        having: {
          id: {
            _count: {
              gt: 1
            }
          }
        }
      })
    ]);

    const summary = {
      failedSettlementCount: failedSettlements.length,
      retryableSettlementCount: retryableSettlements.length,
      processingSettlementCount: processingSettlements.length,
      orphanReadySettlementCount: orphanReadySettlements.length,
      duplicateReleaseEntryCount: duplicateReleaseEntries.length,
      generatedAt: new Date().toISOString()
    };

    void writeAuditLog({
      request,
      actorUserId: authUser.userId,
      action: "ADMIN_FINANCE_RECONCILIATION_VIEWED",
      entityType: "SETTLEMENT",
      metadata: summary
    });

    return {
      summary,
      failedSettlements,
      retryableSettlements,
      processingSettlements,
      orphanReadySettlements,
      duplicateReleaseEntries
    };
  });


  app.post("/admin/disputes/:id/resolve/buyer-refund", { preHandler: [authenticate, requireModerator] }, async (request, reply) => {
    const authUser = requireAuthUser(request);
    const params = idParamsSchema.safeParse(request.params);
    const body = disputeResolutionSchema.safeParse(request.body);

    if (!params.success || !body.success) {
      return reply.code(400).send({ error: "Invalid dispute resolution payload." });
    }

    const scope = await requireAdminOrganizationScope(request, reply);
    if (!scope) return;

    const dispute = await prisma.dispute.findFirst({
      where: {
        id: params.data.id,
        ...(scope.organizationId ? { safeDeal: { organizationId: scope.organizationId } } : {})
      },
      include: { safeDeal: true }
    });

    if (!dispute) return reply.code(404).send({ error: "Dispute not found." });
    if (!dispute.safeDeal.trustLayerEscrowId) return reply.code(409).send({ error: "Safe Deal is missing TrustLayer escrow reference." });

    const trustLayer = getTrustLayerClient();
    const command = await trustLayer.resolveDisputeBuyerRefund({
      escrowId: dispute.safeDeal.trustLayerEscrowId,
      disputeId: dispute.id,
      safeDealId: dispute.safeDealId,
      resolutionNote: body.data.resolutionNote
    }, {
      correlationId: request.id,
      idempotencyKey: `dispute_refund_${dispute.id}_${authUser.userId}`
    });

    await prisma.disputeEvent.create({
      data: {
        disputeId: dispute.id,
        actorUserId: authUser.userId,
        eventType: "RESOLVED",
        note: body.data.resolutionNote,
        metadata: { command, sync: "PENDING_WEBHOOK" }
      }
    });

    void writeAuditLog({ request, actorUserId: authUser.userId, action: "DISPUTE_BUYER_REFUND_COMMAND_SENT", entityType: "DISPUTE", entityId: dispute.id, metadata: { safeDealId: dispute.safeDealId } });

    return { disputeId: dispute.id, trustLayer: command, sync: "PENDING_WEBHOOK" };
  });

  app.post("/admin/disputes/:id/resolve/seller-release", { preHandler: [authenticate, requireModerator] }, async (request, reply) => {
    const authUser = requireAuthUser(request);
    const params = idParamsSchema.safeParse(request.params);
    const body = disputeResolutionSchema.safeParse(request.body);

    if (!params.success || !body.success) {
      return reply.code(400).send({ error: "Invalid dispute resolution payload." });
    }

    const scope = await requireAdminOrganizationScope(request, reply);
    if (!scope) return;

    const dispute = await prisma.dispute.findFirst({
      where: {
        id: params.data.id,
        ...(scope.organizationId ? { safeDeal: { organizationId: scope.organizationId } } : {})
      },
      include: { safeDeal: true }
    });

    if (!dispute) return reply.code(404).send({ error: "Dispute not found." });
    if (!dispute.safeDeal.trustLayerEscrowId) return reply.code(409).send({ error: "Safe Deal is missing TrustLayer escrow reference." });

    const trustLayer = getTrustLayerClient();
    const command = await trustLayer.resolveDisputeSellerRelease({
      escrowId: dispute.safeDeal.trustLayerEscrowId,
      disputeId: dispute.id,
      safeDealId: dispute.safeDealId,
      resolutionNote: body.data.resolutionNote
    }, {
      correlationId: request.id,
      idempotencyKey: `dispute_release_${dispute.id}_${authUser.userId}`
    });

    await prisma.disputeEvent.create({
      data: {
        disputeId: dispute.id,
        actorUserId: authUser.userId,
        eventType: "RESOLVED",
        note: body.data.resolutionNote,
        metadata: { command, sync: "PENDING_WEBHOOK" }
      }
    });

    void writeAuditLog({ request, actorUserId: authUser.userId, action: "DISPUTE_SELLER_RELEASE_COMMAND_SENT", entityType: "DISPUTE", entityId: dispute.id, metadata: { safeDealId: dispute.safeDealId } });

    return { disputeId: dispute.id, trustLayer: command, sync: "PENDING_WEBHOOK" };
  });

  app.get("/admin/audit-logs", { preHandler: [authenticate, requireSuperAdmin] }, async () => {
    const auditLogs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100
    });

    return { auditLogs };
  });

  app.get("/admin/disputes", { preHandler: [authenticate, requireModerator] }, async (request, reply) => {
    const query = disputeListQuerySchema.safeParse(request.query);

    if (!query.success) {
      return reply.code(400).send({ error: "Invalid dispute query." });
    }

    const scope = await requireAdminOrganizationScope(request, reply);
    if (!scope) return;

    const disputes = await prisma.dispute.findMany({
      where: {
        ...(query.data.status ? { status: query.data.status } : {}),
        ...(scope.organizationId ? { safeDeal: { organizationId: scope.organizationId } } : {})
      },
      include: {
        safeDeal: {
          include: {
            listing: {
              select: {
                id: true,
                title: true,
                price: true,
                category: true
              }
            },
            buyer: {
              select: {
                id: true,
                phone: true,
                email: true,
                trustScore: true,
                trustTier: true
              }
            },
            seller: {
              select: {
                id: true,
                phone: true,
                email: true,
                trustScore: true,
                trustTier: true
              }
            }
          }
        },
        openedBy: {
          select: {
            id: true,
            phone: true,
            email: true
          }
        },
        events: {
          orderBy: { createdAt: "desc" },
          take: 5
        }
      },
      orderBy: { updatedAt: "desc" },
      take: 100
    });

    return { disputes };
  });

  app.get("/admin/disputes/:id", { preHandler: [authenticate, requireModerator] }, async (request, reply) => {
    const params = idParamsSchema.safeParse(request.params);

    if (!params.success) {
      return reply.code(400).send({ error: "Invalid dispute ID." });
    }

    const scope = await requireAdminOrganizationScope(request, reply);
    if (!scope) return;

    const dispute = await prisma.dispute.findFirst({
      where: {
        id: params.data.id,
        ...(scope.organizationId ? { safeDeal: { organizationId: scope.organizationId } } : {})
      },
      include: {
        safeDeal: {
          include: {
            listing: true,
            buyer: {
              select: {
                id: true,
                phone: true,
                email: true,
                trustScore: true,
                trustTier: true
              }
            },
            seller: {
              select: {
                id: true,
                phone: true,
                email: true,
                trustScore: true,
                trustTier: true
              }
            },
            settlement: true,
            ledgerEntries: {
              orderBy: { createdAt: "asc" }
            }
          }
        },
        openedBy: {
          select: {
            id: true,
            phone: true,
            email: true
          }
        },
        events: {
          orderBy: { createdAt: "asc" }
        }
      }
    });

    if (!dispute) {
      return reply.code(404).send({ error: "Dispute not found." });
    }

    return { dispute };
  });

  app.post("/admin/disputes/:id/note", { preHandler: [authenticate, requireModerator] }, async (request, reply) => {
    const authUser = requireAuthUser(request);
    const params = idParamsSchema.safeParse(request.params);
    const body = disputeNoteSchema.safeParse(request.body);

    if (!params.success || !body.success) {
      return reply.code(400).send({ error: "Invalid dispute note payload." });
    }

    const scope = await requireAdminOrganizationScope(request, reply);
    if (!scope) return;

    const dispute = await prisma.dispute.findFirst({
      where: {
        id: params.data.id,
        ...(scope.organizationId ? { safeDeal: { organizationId: scope.organizationId } } : {})
      }
    });

    if (!dispute) {
      return reply.code(404).send({ error: "Dispute not found." });
    }

    const event = await prisma.disputeEvent.create({
      data: {
        disputeId: dispute.id,
        actorUserId: authUser.userId,
        eventType: "MODERATOR_NOTE",
        note: body.data.note
      }
    });

    void writeAuditLog({
      request,
      actorUserId: authUser.userId,
      action: "ADMIN_DISPUTE_NOTE_ADDED",
      entityType: "DISPUTE",
      entityId: dispute.id
    });

    return { event };
  });

  app.post("/admin/disputes/:id/status", { preHandler: [authenticate, requireModerator] }, async (request, reply) => {
    const authUser = requireAuthUser(request);
    const params = idParamsSchema.safeParse(request.params);
    const body = disputeStatusSchema.safeParse(request.body);

    if (!params.success || !body.success) {
      return reply.code(400).send({ error: "Invalid dispute status payload." });
    }

    const scope = await requireAdminOrganizationScope(request, reply);
    if (!scope) return;

    const existingDispute = await prisma.dispute.findFirst({
      where: {
        id: params.data.id,
        ...(scope.organizationId ? { safeDeal: { organizationId: scope.organizationId } } : {})
      }
    });

    if (!existingDispute) {
      return reply.code(404).send({ error: "Dispute not found." });
    }

    const result = await prisma.$transaction(async (tx) => {
      const dispute = await tx.dispute.update({
        where: { id: existingDispute.id },
        data: {
          status: body.data.status
        }
      });

      const event = await tx.disputeEvent.create({
        data: {
          disputeId: dispute.id,
          actorUserId: authUser.userId,
          eventType: "STATUS_CHANGED",
          note: body.data.note,
          metadata: {
            status: body.data.status,
            boundary: "RENDER_PROJECTION_ONLY"
          }
        }
      });

      return { dispute, event };
    });

    void writeAuditLog({
      request,
      actorUserId: authUser.userId,
      action: "ADMIN_DISPUTE_STATUS_UPDATED",
      entityType: "DISPUTE",
      entityId: result.dispute.id,
      metadata: {
        status: result.dispute.status,
        boundary: "RENDER_PROJECTION_ONLY"
      }
    });

    return result;
  });


}
