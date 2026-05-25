import crypto from "node:crypto";
import { normalizeVerificationStatus } from "@render/trustlayer-sdk";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../database/client.js";
import { elapsedMs, nowMs, recordOperationalMetric } from "@render/observability";
import { writeAuditLog } from "../audit/log.js";

import { deriveTrustLayerEventId, isUniqueConstraintError, mapTrustLayerEscrowStatus, verifyHmac } from "./helpers.js";

const trustLayerWebhookSchema = z.object({
  id: z.string().optional(),
  eventId: z.string().optional(),
  event: z.string(),
  data: z.object({
    userId: z.string().uuid().optional(),
    trustlayerUserId: z.string().optional(),
    verificationLevel: z.number().int().min(0).max(5).optional(),
    trustScore: z.number().int().min(0).max(1000).optional(),
    trustTier: z.enum(["NEW", "BUILDING", "VERIFIED", "TRUSTED"]).optional(),
    verificationStatus: z.string().min(1).max(50).optional(),
    trustBadge: z.string().min(1).max(100).optional(),
    escrowId: z.string().optional(),
    escrowStatus: z.string().optional(),
    paymentUrl: z.string().optional(),
    syncedAt: z.string().optional()
  }).passthrough()
});

type RawBodyRequest = {
  rawBody?: string;
};

function firstHeaderValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function isTrustLayerUserEvent(event: string): boolean {
  return event.startsWith("identity.") || event.startsWith("trust.");
}

function isTrustLayerEscrowEvent(event: string): boolean {
  return event.startsWith("escrow.") || event.startsWith("safedeal.");
}

function classifyTrustLayerEvent(event: string): "USER" | "SAFE_DEAL" | "UNKNOWN" {
  if (isTrustLayerUserEvent(event)) return "USER";
  if (isTrustLayerEscrowEvent(event)) return "SAFE_DEAL";
  return "UNKNOWN";
}


export async function registerWebhookRoutes(app: FastifyInstance): Promise<void> {
  app.post("/webhooks/trustlayer", { config: { rawBody: true } }, async (request, reply) => {
    const webhookStartedAt = nowMs();
    const rawBody = (request as RawBodyRequest).rawBody ?? JSON.stringify(request.body ?? {});
    const signature = firstHeaderValue(request.headers["x-trustlayer-signature"]);

    if (
      !verifyHmac({
        payload: rawBody,
        signature,
        secret: process.env.TRUSTLAYER_WEBHOOK_SECRET
      })
    ) {
      void writeAuditLog({ request, action: "WEBHOOK_TRUSTLAYER_INVALID_SIGNATURE" });

      recordOperationalMetric({
        name: "webhook.processing.duration_ms",
        value: elapsedMs(webhookStartedAt),
        unit: "ms",
        correlationId: request.id,
        aggregateId: "trustlayer.invalid_signature",
        source: "render.api",
        metadata: {
          provider: "TRUSTLAYER",
          status: "INVALID_SIGNATURE"
        }
      });

      return reply.code(401).send({ error: "Invalid TrustLayer signature." });
    }

    const parsed = trustLayerWebhookSchema.safeParse(request.body);

    if (!parsed.success) {
      const failedEventId = deriveTrustLayerEventId({ rawBody });

      await prisma.webhookEvent.create({
        data: {
          provider: "TRUSTLAYER",
          eventId: failedEventId,
          eventType: "INVALID_PAYLOAD",
          status: "FAILED",
          processedAt: new Date(),
          payload: {
            reason: "INVALID_PAYLOAD",
            issues: JSON.parse(JSON.stringify(parsed.error.issues)),
            rawBody
          }
        }
      }).catch((error) => {
        if (!isUniqueConstraintError(error)) throw error;
      });

      void writeAuditLog({
        request,
        action: "WEBHOOK_TRUSTLAYER_INVALID_PAYLOAD",
        metadata: {
          eventId: failedEventId
        }
      });

      recordOperationalMetric({
        name: "webhook.processing.duration_ms",
        value: elapsedMs(webhookStartedAt),
        unit: "ms",
        correlationId: request.id,
        aggregateId: failedEventId,
        source: "render.api",
        metadata: {
          provider: "TRUSTLAYER",
          status: "INVALID_PAYLOAD"
        }
      });

      return reply.code(400).send({ error: "Invalid TrustLayer webhook payload." });
    }

    const trustLayerEventId = deriveTrustLayerEventId({
      explicitEventId: parsed.data.eventId,
      id: parsed.data.id,
      rawBody
    });

    try {
      await prisma.webhookEvent.create({
        data: {
          provider: "TRUSTLAYER",
          eventId: trustLayerEventId,
          eventType: parsed.data.event,
          status: "RECEIVED",
          payload: JSON.parse(JSON.stringify(parsed.data))
        }
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        void writeAuditLog({
          request,
          action: "WEBHOOK_TRUSTLAYER_DUPLICATE_IGNORED",
          metadata: {
            event: parsed.data.event,
            eventId: trustLayerEventId
          }
        });

        await prisma.webhookEvent.update({
          where: {
            provider_eventId: {
              provider: "TRUSTLAYER",
              eventId: trustLayerEventId
            }
          },
          data: {
            status: "DUPLICATE",
            processedAt: new Date()
          }
        });

        recordOperationalMetric({
          name: "webhook.processing.duration_ms",
          value: elapsedMs(webhookStartedAt),
          unit: "ms",
          correlationId: request.id,
          aggregateId: trustLayerEventId,
          source: "render.api",
          metadata: {
            provider: "TRUSTLAYER",
            event: parsed.data.event,
            status: "DUPLICATE"
          }
        });

        return {
          received: true,
          duplicate: true
        };
      }

      throw error;
    }

    const {
      userId,
      trustlayerUserId,
      verificationLevel,
      trustScore,
      trustTier,
      verificationStatus,
      trustBadge,
      escrowId,
      escrowStatus,
      paymentUrl,
      syncedAt
    } = parsed.data.data;

    void writeAuditLog({
      request,
      actorUserId: userId,
      action: "WEBHOOK_TRUSTLAYER_RECEIVED",
      entityType: userId ? "USER" : escrowId ? "SAFE_DEAL" : undefined,
      entityId: userId,
      metadata: {
        event: parsed.data.event,
        trustlayerUserId,
        escrowId,
        escrowStatus
      }
    });

    const eventTime = syncedAt ? new Date(syncedAt) : new Date();
    const projectionType = classifyTrustLayerEvent(parsed.data.event);
    let updatedEscrows = 0;

    try {
    if (isTrustLayerUserEvent(parsed.data.event) && (userId || trustlayerUserId)) {
      const userSyncResult = await prisma.user.updateMany({
        where: {
          ...(userId ? { id: userId } : { trustlayerUserId }),
          OR: [{ trustLastSyncedAt: null }, { trustLastSyncedAt: { lte: eventTime } }]
        },
        data: {
          ...(verificationLevel !== undefined ? { verificationLevel } : {}),
          ...(trustScore !== undefined ? { trustScore } : {}),
          ...(trustTier !== undefined ? { trustTier } : {}),
          ...(verificationStatus !== undefined
            ? { verificationStatusCached: normalizeVerificationStatus(verificationStatus) }
            : {}),

          verificationLastSyncedAt: new Date(),
          verificationProjectionExpiresAt: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000
          ),
          ...(trustBadge !== undefined ? { trustBadgeCached: trustBadge } : {}),
          ...(verificationLevel !== undefined ||
          trustScore !== undefined ||
          trustTier !== undefined ||
          verificationStatus !== undefined ||
          trustBadge !== undefined
            ? { trustLastSyncedAt: eventTime }
            : {})
        }
      });

      if (userSyncResult.count === 0) {
        void writeAuditLog({
          request,
          actorUserId: userId,
          action: "WEBHOOK_TRUSTLAYER_STALE_USER_EVENT_IGNORED",
          entityType: "USER",
          entityId: userId,
          metadata: {
            event: parsed.data.event,
            trustlayerUserId,
            incomingSyncedAt: eventTime.toISOString()
          }
        });

        recordOperationalMetric({
          name: "webhook.processing.duration_ms",
          value: elapsedMs(webhookStartedAt),
          unit: "ms",
          correlationId: request.id,
          aggregateId: trustLayerEventId,
          source: "render.api",
          metadata: {
            provider: "TRUSTLAYER",
            event: parsed.data.event,
            status: "STALE_IGNORED",
            projection: "USER"
          }
        });
      }
    }

    if (!isTrustLayerUserEvent(parsed.data.event) && !isTrustLayerEscrowEvent(parsed.data.event)) {
      void writeAuditLog({
        request,
        action: "WEBHOOK_TRUSTLAYER_UNKNOWN_EVENT_IGNORED",
        metadata: {
          event: parsed.data.event,
          trustlayerUserId,
          escrowId
        }
      });

      recordOperationalMetric({
        name: "webhook.processing.duration_ms",
        value: elapsedMs(webhookStartedAt),
        unit: "ms",
        correlationId: request.id,
        aggregateId: trustLayerEventId,
        source: "render.api",
        metadata: {
          provider: "TRUSTLAYER",
          event: parsed.data.event,
          status: "UNKNOWN_IGNORED"
        }
      });
    }

    if (isTrustLayerEscrowEvent(parsed.data.event) && escrowId) {
      const mappedStatus = mapTrustLayerEscrowStatus(escrowStatus);

      if (mappedStatus) {
        const syncResult = await prisma.$transaction(async (tx) => {
          const existing = await tx.safeDeal.findFirst({
            where: {
              trustLayerEscrowId: escrowId
            }
          });

          if (!existing) {
            return { updatedCount: 0, settlementId: null as string | null, organizationId: null as string | null };
          }

          if (existing.escrowLastSyncedAt && existing.escrowLastSyncedAt > eventTime) {
            void writeAuditLog({
              request,
              organizationId: existing.organizationId,
              action: "WEBHOOK_TRUSTLAYER_STALE_ESCROW_EVENT_IGNORED",
              entityType: "SAFE_DEAL",
              entityId: existing.id,
              metadata: {
                escrowId,
                event: parsed.data.event,
                incomingSyncedAt: eventTime.toISOString(),
                currentSyncedAt: existing.escrowLastSyncedAt.toISOString()
              }
            });

            recordOperationalMetric({
              name: "webhook.processing.duration_ms",
              value: elapsedMs(webhookStartedAt),
              unit: "ms",
              correlationId: request.id,
              aggregateId: trustLayerEventId,
              source: "render.api",
              metadata: {
                provider: "TRUSTLAYER",
                event: parsed.data.event,
                status: "STALE_IGNORED",
                projection: "SAFE_DEAL"
              }
            });

            return { updatedCount: 0, settlementId: null as string | null, organizationId: existing.organizationId };
          }

          const wasAlreadyConfirmed = existing.status === "CONFIRMED";

          const updated = await tx.safeDeal.update({
            where: { id: existing.id },
            data: {
              status: mappedStatus,
              escrowStatusCached: escrowStatus,
              checkoutUrl: paymentUrl ?? undefined,
              escrowLastSyncedAt: eventTime,

              ...(mappedStatus === "FUNDED"
                ? {
                    fundedAt: eventTime,
                    inspectionDeadline: new Date(eventTime.getTime() + 48 * 60 * 60 * 1000)
                  }
                : {}),

              ...(mappedStatus === "CONFIRMED"
                ? {
                    confirmedAt: eventTime
                  }
                : {}),

              ...(mappedStatus === "DELIVERED"
                ? {
                    deliveredAt: eventTime
                  }
                : {})
            }
          });

          return { updatedCount: 1, settlementId: null as string | null, organizationId: updated.organizationId };
        });

        updatedEscrows = syncResult.updatedCount;

      }
    }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown webhook processing error.";

      await prisma.webhookEvent.update({
        where: {
          provider_eventId: {
            provider: "TRUSTLAYER",
            eventId: trustLayerEventId
          }
        },
        data: {
          status: "FAILED",
          processedAt: new Date(),
          payload: JSON.parse(JSON.stringify({
            ...parsed.data,
            processingError: errorMessage
          }))
        }
      });

      void writeAuditLog({
        request,
        action: "WEBHOOK_TRUSTLAYER_PROCESSING_FAILED",
        metadata: {
          event: parsed.data.event,
          eventId: trustLayerEventId,
          projection: projectionType,
          processingError: errorMessage
        }
      });

      recordOperationalMetric({
        name: "webhook.processing.duration_ms",
        value: elapsedMs(webhookStartedAt),
        unit: "ms",
        correlationId: request.id,
        aggregateId: trustLayerEventId,
        source: "render.api",
        metadata: {
          provider: "TRUSTLAYER",
          event: parsed.data.event,
          status: "FAILED",
          projection: projectionType
        }
      });

      return reply.code(500).send({ error: "Webhook processing failed." });
    }

    await prisma.webhookEvent.update({
      where: {
        provider_eventId: {
          provider: "TRUSTLAYER",
          eventId: trustLayerEventId
        }
      },
      data: {
        status: "PROCESSED",
        processedAt: new Date()
      }
    });

    recordOperationalMetric({
      name: "webhook.processing.duration_ms",
      value: elapsedMs(webhookStartedAt),
      unit: "ms",
      correlationId: request.id,
      aggregateId: trustLayerEventId,
      source: "render.api",
      metadata: {
        provider: "TRUSTLAYER",
        event: parsed.data.event,
        status: "PROCESSED",
        projection: projectionType,
        updatedEscrows
      }
    });

    return {
      received: true,
      updatedEscrows
    };
  });
}
