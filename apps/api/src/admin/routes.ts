import { createTrustLayerClient } from "@render/trustlayer-sdk";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, requireAdmin, requireAuthUser, requireModerator, requireSuperAdmin } from "../auth/middleware.js";
import { writeAuditLog } from "../audit/log.js";
import { prisma } from "../database/client.js";
import { createRenderQueue, RENDER_QUEUE_NAMES, type NotificationReplayRequestJobData, type WebhookReplayRequestJobData } from "@render/queue";
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

const notificationReplayRateLimitWindowMs = 60_000;
const notificationReplayRateLimitMaxRequests = 3;
const notificationReplayTtlMs = 7 * 24 * 60 * 60 * 1000;
const notificationReplayRateLimitHits = new Map<string, { count: number; resetAt: number }>();

const webhookEventListQuerySchema = z.object({
  provider: z.string().trim().max(40).optional(),
  status: z.enum(["RECEIVED", "PROCESSED", "DUPLICATE", "FAILED"]).optional(),
  eventType: z.string().trim().max(120).optional(),
  failedOnly: z.coerce.boolean().optional(),
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
  app.post("/admin/webhooks/events/:id/replay-request", { preHandler: [authenticate, requireSuperAdmin] }, async (request, reply) => {
    const authUser = requireAuthUser(request);
    const params = idParamsSchema.safeParse(request.params);
    const body = z.object({ reason: z.string().min(10).max(1000) }).safeParse(request.body);

    if (!params.success || !body.success) {
      return reply.code(400).send({ error: "Invalid webhook replay request payload." });
    }

    const event = await prisma.webhookEvent.findUnique({
      where: { id: params.data.id },
      select: {
        id: true,
        provider: true,
        eventId: true,
        eventType: true,
        status: true,
        payload: true
      }
    });

    if (!event) {
      return reply.code(404).send({ error: "Webhook event not found." });
    }

    if (event.status !== "FAILED") {
      return reply.code(409).send({ error: "Only failed webhook events can be submitted for replay review." });
    }

    const manualApproval = true;
    const automaticReplay = false;
    const replayMode = "MANUAL_OPERATOR_REVIEW_REQUIRED";

    void writeAuditLog({
      request,
      actorUserId: authUser.userId,
      action: "WEBHOOK_EVENT_REPLAY_REVIEW_REQUESTED",
      entityType: "WEBHOOK_EVENT",
      entityId: event.id,
      metadata: {
        provider: event.provider,
        eventId: event.eventId,
        eventType: event.eventType,
        reason: body.data.reason,
        manualApproval,
        automaticReplay,
        replayMode
      }
    });

    const replayQueue = createRenderQueue(RENDER_QUEUE_NAMES.webhookReplayRequest);
    await replayQueue.add(
      `webhook_replay_review_${event.id}`,
      {
        webhookEventId: event.id,
        provider: event.provider as WebhookReplayRequestJobData["provider"],
        eventId: event.eventId,
        eventType: event.eventType,
        requestedByUserId: authUser.userId,
        reason: body.data.reason,
        requestedAt: new Date().toISOString(),
        manualApproval,
        automaticReplay,
        replayMode,
        idempotencyKey: `webhook_replay_review_${event.id}`,
        correlationId: request.id
      },
      {
        jobId: `webhook_replay_review_${event.id}`
      }
    );
    await replayQueue.close();

    recordOperationalMetric({
      name: "webhook.replay.requested",
      value: 1,
      unit: "count",
      correlationId: request.id,
      aggregateId: event.eventId,
      source: "render.api",
      metadata: {
        provider: event.provider,
        eventType: event.eventType,
        status: event.status,
        manualApproval,
        automaticReplay,
        replayMode
      }
    });

    return reply.code(202).send({
      replayRequested: true,
      replayQueued: false,
      manualApproval,
      automaticReplay,
      replayMode,
      event: {
        id: event.id,
        provider: event.provider,
        eventId: event.eventId,
        eventType: event.eventType,
        status: event.status
      }
    });
  });

  app.get("/admin/webhooks/events", { preHandler: [authenticate, requireSuperAdmin] }, async (request, reply) => {
    const query = webhookEventListQuerySchema.safeParse(request.query);

    if (!query.success) {
      return reply.code(400).send({ error: "Invalid webhook event query." });
    }

    const events = await prisma.webhookEvent.findMany({
      where: {
        ...(query.data.provider ? { provider: query.data.provider } : {}),
        ...(query.data.failedOnly ? { status: "FAILED" } : query.data.status ? { status: query.data.status } : {}),
        ...(query.data.eventType ? { eventType: query.data.eventType } : {})
      },
      select: {
        id: true,
        provider: true,
        eventId: true,
        eventType: true,
        status: true,
        processedAt: true,
        payload: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: "desc" },
      take: query.data.take
    });

    return { events };
  });


  app.get("/admin/reviews", { preHandler: [authenticate, requireModerator] }, async () => {
    const [reviews, reports] = await Promise.all([
      prisma.review.findMany({
        select: {
          id: true,
          rating: true,
          body: true,
          createdAt: true,
          safeDealId: true,
          reviewer: {
            select: {
              id: true,
              phone: true,
              email: true,
              isBusiness: true
            }
          },
          reviewee: {
            select: {
              id: true,
              phone: true,
              email: true,
              isBusiness: true
            }
          }
        },
        orderBy: { createdAt: "desc" },
        take: 100
      }),
      prisma.auditLog.findMany({
        where: {
          action: "REVIEW_REPORTED",
          entityType: "REVIEW"
        },
        select: {
          entityId: true,
          createdAt: true,
          metadata: true
        },
        orderBy: { createdAt: "desc" },
        take: 500
      })
    ]);

    const reportCounts = new Map<string, number>();
    const latestReportReasons = new Map<string, string>();

    for (const report of reports) {
      if (!report.entityId) continue;

      reportCounts.set(report.entityId, (reportCounts.get(report.entityId) ?? 0) + 1);

      if (!latestReportReasons.has(report.entityId)) {
        const metadata = report.metadata as { reason?: unknown } | null;
        latestReportReasons.set(
          report.entityId,
          typeof metadata?.reason === "string" ? metadata.reason : "No reason provided."
        );
      }
    }

    return {
      reviews: reviews.map((review) => ({
        id: review.id,
        rating: review.rating,
        body: review.body,
        createdAt: review.createdAt,
        safeDealId: review.safeDealId,
        reportCount: reportCounts.get(review.id) ?? 0,
        latestReportReason: latestReportReasons.get(review.id) ?? null,
        reviewer: {
          id: review.reviewer.id,
          label: review.reviewer.phone ?? review.reviewer.email ?? review.reviewer.id,
          isBusiness: review.reviewer.isBusiness
        },
        reviewee: {
          id: review.reviewee.id,
          label: review.reviewee.phone ?? review.reviewee.email ?? review.reviewee.id,
          isBusiness: review.reviewee.isBusiness
        }
      }))
    };
  });

  app.delete("/admin/reviews/:id", { preHandler: [authenticate, requireModerator] }, async (request, reply) => {
    const authUser = requireAuthUser(request);
    const params = idParamsSchema.safeParse(request.params);
    const body = z.object({ reason: z.string().trim().min(5).max(1000) }).safeParse(request.body);

    if (!params.success || !body.success) {
      return reply.code(400).send({ error: "Invalid review removal payload." });
    }

    const review = await prisma.review.findUnique({
      where: { id: params.data.id },
      select: {
        id: true,
        safeDealId: true,
        reviewerId: true,
        revieweeId: true,
        rating: true,
        body: true
      }
    });

    if (!review) {
      return reply.code(404).send({ error: "Review not found." });
    }

    await prisma.review.delete({
      where: { id: review.id }
    });

    void writeAuditLog({
      request,
      actorUserId: authUser.userId,
      action: "REVIEW_REMOVED",
      entityType: "REVIEW",
      entityId: review.id,
      metadata: {
        reason: body.data.reason,
        safeDealId: review.safeDealId,
        reviewerId: review.reviewerId,
        revieweeId: review.revieweeId,
        rating: review.rating,
        hadBody: Boolean(review.body)
      }
    });

    return reply.code(204).send();
  });

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
    const rateLimitKey = `${authUser.userId}:${params.data.id}`;
    const now = Date.now();
    const currentRateLimit = notificationReplayRateLimitHits.get(rateLimitKey);

    if (currentRateLimit && currentRateLimit.resetAt > now && currentRateLimit.count >= notificationReplayRateLimitMaxRequests) {
      const retryAfterSeconds = Math.ceil((currentRateLimit.resetAt - now) / 1000);
      const rateLimitEvent = createRenderEvent({
        id: crypto.randomUUID(),
        type: RENDER_EVENT_TYPES.notificationReplayRateLimited,
        aggregateId: params.data.id,
        correlationId: crypto.randomUUID(),
        source: "render.api",
        payload: {
          deadLetterJobId: params.data.id,
          userId: authUser.userId,
          status: "REPLAY_RATE_LIMITED",
          retryAfterSeconds,
          manualApproval,
          automaticReplay,
          replayMode
        }
      });

      recordOperationalMetric({
        name: "notification.replay.rate_limited",
        value: 1,
        unit: "count",
        correlationId: rateLimitEvent.correlationId,
        aggregateId: params.data.id,
        source: "render.api",
        metadata: {
          deadLetterJobId: params.data.id,
          userId: authUser.userId,
          retryAfterSeconds
        }
      });

      void writeAuditLog({
        request,
        actorUserId: authUser.userId,
        action: "NOTIFICATION_DEAD_LETTER_REPLAY_RATE_LIMITED",
        entityType: "NOTIFICATION_DEAD_LETTER",
        entityId: params.data.id,
        metadata: {
          rateLimitKey,
          retryAfterSeconds,
          rateLimitEvent: {
            id: rateLimitEvent.id,
            type: rateLimitEvent.type,
            correlationId: rateLimitEvent.correlationId,
            occurredAt: rateLimitEvent.occurredAt
          },
          manualApproval,
          automaticReplay,
          replayMode
        }
      });

      return reply.code(429).send({
        replayRequested: false,
        rateLimited: true,
        retryAfterSeconds,
        manualApproval,
        automaticReplay,
        replayMode
      });
    }

    notificationReplayRateLimitHits.set(rateLimitKey, {
      count: currentRateLimit && currentRateLimit.resetAt > now ? currentRateLimit.count + 1 : 1,
      resetAt: currentRateLimit && currentRateLimit.resetAt > now ? currentRateLimit.resetAt : now + notificationReplayRateLimitWindowMs
    });

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
    const failedAtMs = Date.parse(data.failedAt);
    const replayAgeMs = now - failedAtMs;

    if (!Number.isFinite(failedAtMs) || replayAgeMs > notificationReplayTtlMs) {
      const expiredEvent = createRenderEvent({
        id: crypto.randomUUID(),
        type: RENDER_EVENT_TYPES.notificationReplayExpired,
        aggregateId: data.userId,
        correlationId: data.correlationId,
        source: "render.api",
        payload: {
          deadLetterJobId: String(deadLetterJob.id ?? params.data.id),
          userId: data.userId,
          failedAt: data.failedAt,
          replayAgeMs,
          notificationReplayTtlMs,
          status: "REPLAY_EXPIRED",
          manualApproval,
          automaticReplay,
          replayMode
        }
      });

      recordOperationalMetric({
        name: "notification.replay.expired",
        value: 1,
        unit: "count",
        correlationId: data.correlationId,
        aggregateId: data.userId,
        source: "render.api",
        metadata: {
          deadLetterJobId: String(deadLetterJob.id ?? params.data.id),
          userId: data.userId,
          failedAt: data.failedAt,
          replayAgeMs,
          notificationReplayTtlMs
        }
      });

      void writeAuditLog({
        request,
        actorUserId: authUser.userId,
        action: "NOTIFICATION_DEAD_LETTER_REPLAY_EXPIRED",
        entityType: "NOTIFICATION_DEAD_LETTER",
        entityId: String(deadLetterJob.id ?? params.data.id),
        metadata: {
          failedAt: data.failedAt,
          replayAgeMs,
          notificationReplayTtlMs,
          expiredEvent: {
            id: expiredEvent.id,
            type: expiredEvent.type,
            correlationId: expiredEvent.correlationId,
            occurredAt: expiredEvent.occurredAt
          },
          manualApproval,
          automaticReplay,
          replayMode,
          reason: body.data.reason
        }
      });

      return reply.code(410).send({
        replayRequested: false,
        replayExpired: true,
        deadLetterJobId: String(deadLetterJob.id ?? params.data.id),
        failedAt: data.failedAt,
        replayAgeMs,
        notificationReplayTtlMs,
        manualApproval,
        automaticReplay,
        replayMode
      });
    }

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
    const existingReplayJob = await replayQueue.getJob(replayRequest.idempotencyKey);

    if (existingReplayJob) {
      await replayQueue.close();

      const duplicateEvent = createRenderEvent({
        id: crypto.randomUUID(),
        type: RENDER_EVENT_TYPES.notificationReplayDuplicateRejected,
        aggregateId: data.userId,
        correlationId: data.correlationId,
        source: "render.api",
        payload: {
          deadLetterJobId: replayRequest.deadLetterJobId,
          existingReplayJobId: String(existingReplayJob.id ?? ""),
          userId: data.userId,
          status: "DUPLICATE_REPLAY_REJECTED",
          manualApproval,
          automaticReplay,
          replayMode,
          idempotencyKey: replayRequest.idempotencyKey
        }
      });

      recordOperationalMetric({
        name: "notification.replay.duplicate_rejected",
        value: 1,
        unit: "count",
        correlationId: data.correlationId,
        aggregateId: data.userId,
        source: "render.api",
        metadata: {
          deadLetterJobId: replayRequest.deadLetterJobId,
          existingReplayJobId: String(existingReplayJob.id ?? ""),
          idempotencyKey: replayRequest.idempotencyKey
        }
      });

      void writeAuditLog({
        request,
        actorUserId: authUser.userId,
        action: "NOTIFICATION_DEAD_LETTER_REPLAY_DUPLICATE_REJECTED",
        entityType: "NOTIFICATION_DEAD_LETTER",
        entityId: replayRequest.deadLetterJobId,
        metadata: {
          existingReplayJobId: String(existingReplayJob.id ?? ""),
          idempotencyKey: replayRequest.idempotencyKey,
          deadLetterJobId: replayRequest.deadLetterJobId,
          userId: data.userId,
          originalQueue: data.originalQueue,
          duplicateEvent: {
            id: duplicateEvent.id,
            type: duplicateEvent.type,
            correlationId: duplicateEvent.correlationId,
            occurredAt: duplicateEvent.occurredAt
          },
          manualApproval,
          automaticReplay,
          replayMode,
          reason: body.data.reason
        }
      });

      return reply.code(409).send({
        duplicateRejected: true,
        replayRequested: false,
        existingReplayJobId: existingReplayJob.id,
        deadLetterJobId: replayRequest.deadLetterJobId,
        manualApproval,
        automaticReplay,
        replayMode,
        idempotencyKey: replayRequest.idempotencyKey
      });
    }

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

    const replayQueue = createRenderQueue(RENDER_QUEUE_NAMES.webhookReplayRequest);
    await replayQueue.add(
      `webhook_replay_review_${event.id}`,
      {
        webhookEventId: event.id,
        provider: event.provider as WebhookReplayRequestJobData["provider"],
        eventId: event.eventId,
        eventType: event.eventType,
        requestedByUserId: authUser.userId,
        reason: body.data.reason,
        requestedAt: new Date().toISOString(),
        manualApproval,
        automaticReplay,
        replayMode,
        idempotencyKey: `webhook_replay_review_${event.id}`,
        correlationId: request.id
      },
      {
        jobId: `webhook_replay_review_${event.id}`
      }
    );
    await replayQueue.close();

    recordOperationalMetric({
      name: "webhook.replay.requested",
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


  app.get("/admin/notifications/replay-summary", { preHandler: [authenticate, requireSuperAdmin] }, async (request) => {
    const authUser = requireAuthUser(request);
    const replayActions = [
      "NOTIFICATION_DEAD_LETTER_REPLAY_REQUESTED",
      "NOTIFICATION_DEAD_LETTER_REPLAY_DUPLICATE_REJECTED",
      "NOTIFICATION_DEAD_LETTER_REPLAY_RATE_LIMITED",
      "NOTIFICATION_DEAD_LETTER_REPLAY_EXPIRED",
      "NOTIFICATION_DEAD_LETTER_REPLAY_BLOCKED"
    ];

    const [auditTrail] = await Promise.all([
      prisma.auditLog.findMany({
        where: {
          entityType: "NOTIFICATION_DEAD_LETTER",
          action: { in: replayActions }
        },
        select: {
          action: true,
          createdAt: true
        },
        orderBy: { createdAt: "desc" },
        take: 500
      })
    ]);

    const queue = createRenderQueue(RENDER_QUEUE_NAMES.notificationDeadLetter);

    try {
      const queueCounts = await queue.getJobCounts("waiting", "delayed", "failed");
      const replayReadyCount =
        (queueCounts.waiting ?? 0) +
        (queueCounts.delayed ?? 0) +
        (queueCounts.failed ?? 0);

      const requestedCount = auditTrail.filter((entry) => entry.action === "NOTIFICATION_DEAD_LETTER_REPLAY_REQUESTED").length;
      const duplicateRejectedCount = auditTrail.filter((entry) => entry.action === "NOTIFICATION_DEAD_LETTER_REPLAY_DUPLICATE_REJECTED").length;
      const rateLimitedCount = auditTrail.filter((entry) => entry.action === "NOTIFICATION_DEAD_LETTER_REPLAY_RATE_LIMITED").length;
      const expiredCount = auditTrail.filter((entry) => entry.action === "NOTIFICATION_DEAD_LETTER_REPLAY_EXPIRED").length;
      const blockedCount = auditTrail.filter((entry) => entry.action === "NOTIFICATION_DEAD_LETTER_REPLAY_BLOCKED").length;

      const summary = {
        replayReadyCount,
        requestedCount,
        duplicateRejectedCount,
        rateLimitedCount,
        expiredCount,
        blockedCount,
        auditSampleSize: auditTrail.length,
        replayMode: "MANUAL_OPERATOR_REVIEW_REQUIRED",
        generatedAt: new Date().toISOString()
      };

      recordOperationalMetric({
        name: "notification.replay.summary_viewed",
        value: 1,
        unit: "count",
        correlationId: request.id,
        aggregateId: authUser.userId,
        source: "render.api",
        metadata: summary
      });

      void writeAuditLog({
        request,
        actorUserId: authUser.userId,
        action: "ADMIN_NOTIFICATION_REPLAY_SUMMARY_VIEWED",
        entityType: "NOTIFICATION_DEAD_LETTER",
        metadata: summary
      });

      return {
        summary,
        queueCounts
      };
    } finally {
      await queue.close();
    }
  });

  app.get("/admin/notifications/dead-letter/:id/replay-status", { preHandler: [authenticate, requireSuperAdmin] }, async (request, reply) => {
    const authUser = requireAuthUser(request);
    const params = idParamsSchema.safeParse(request.params);

    if (!params.success) {
      return reply.code(400).send({ error: "Invalid notification dead-letter ID." });
    }

    const replayActions = [
      "NOTIFICATION_DEAD_LETTER_REPLAY_REQUESTED",
      "NOTIFICATION_DEAD_LETTER_REPLAY_DUPLICATE_REJECTED",
      "NOTIFICATION_DEAD_LETTER_REPLAY_RATE_LIMITED",
      "NOTIFICATION_DEAD_LETTER_REPLAY_EXPIRED",
      "NOTIFICATION_DEAD_LETTER_REPLAY_BLOCKED"
    ];

    const [auditTrail] = await Promise.all([
      prisma.auditLog.findMany({
        where: {
          entityType: "NOTIFICATION_DEAD_LETTER",
          entityId: params.data.id,
          action: { in: replayActions }
        },
        orderBy: { createdAt: "desc" },
        take: 25
      })
    ]);

    const queue = createRenderQueue(RENDER_QUEUE_NAMES.notificationDeadLetter);

    try {
      const deadLetterJob = await queue.getJob(params.data.id);
      const deadLetterState = deadLetterJob ? await deadLetterJob.getState() : "not_found";
      const latestAction = auditTrail[0]?.action ?? null;

      const replayStatus =
        latestAction === "NOTIFICATION_DEAD_LETTER_REPLAY_REQUESTED"
          ? "REQUESTED"
          : latestAction === "NOTIFICATION_DEAD_LETTER_REPLAY_DUPLICATE_REJECTED"
            ? "DUPLICATE_REJECTED"
            : latestAction === "NOTIFICATION_DEAD_LETTER_REPLAY_RATE_LIMITED"
              ? "RATE_LIMITED"
              : latestAction === "NOTIFICATION_DEAD_LETTER_REPLAY_EXPIRED"
                ? "EXPIRED"
                : latestAction === "NOTIFICATION_DEAD_LETTER_REPLAY_BLOCKED"
                  ? "BLOCKED"
                  : deadLetterJob
                    ? "REPLAY_READY"
                    : "NOT_FOUND";

      const deadLetter = deadLetterJob
        ? {
            id: String(deadLetterJob.id ?? ""),
            queue: RENDER_QUEUE_NAMES.notificationDeadLetter,
            state: deadLetterState,
            payload: deadLetterJob.data,
            attemptsMade: deadLetterJob.attemptsMade,
            failedReason: deadLetterJob.failedReason,
            timestamp: deadLetterJob.timestamp,
            processedOn: deadLetterJob.processedOn,
            finishedOn: deadLetterJob.finishedOn
          }
        : null;

      void writeAuditLog({
        request,
        actorUserId: authUser.userId,
        action: "ADMIN_NOTIFICATION_REPLAY_STATUS_VIEWED",
        entityType: "NOTIFICATION_DEAD_LETTER",
        entityId: params.data.id,
        metadata: {
          replayStatus,
          deadLetterState,
          auditTrailCount: auditTrail.length,
          replayMode: "MANUAL_OPERATOR_REVIEW_REQUIRED"
        }
      });

      return {
        replayStatus,
        replayMode: "MANUAL_OPERATOR_REVIEW_REQUIRED",
        deadLetter,
        auditTrail
      };
    } finally {
      await queue.close();
    }
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
      data: {
        status: "LIVE",
        expiresAt: existingListing.expiresAt ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
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
      failedSettlementProjections,
      pendingSettlementProjections,
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
          status: {
            in: ["FAILED", "PROCESSING"]
          }
        },
        include: { safeDeal: true },
        orderBy: { updatedAt: "desc" },
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
      failedSettlementProjectionCount: failedSettlementProjections.length,
      pendingSettlementProjectionCount: pendingSettlementProjections.length,
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
      failedSettlementProjections,
      pendingSettlementProjections,
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
