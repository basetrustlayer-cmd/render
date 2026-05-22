import crypto from "node:crypto";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../database/client.js";
import { verifyPaystackSignature } from "../payments/paystack.js";
import { writeAuditLog } from "../audit/log.js";
import { createSettlementLedgerForConfirmedDeal } from "../ledger/settlement.js";

function verifyHmac({
  payload,
  signature,
  secret,
  digest = "hex"
}: {
  payload: string;
  signature: string | undefined;
  secret: string | undefined;
  digest?: crypto.BinaryToTextEncoding;
}): boolean {
  if (!signature || !secret) {
    return false;
  }

  const expected = crypto.createHmac("sha512", secret).update(payload).digest(digest);

  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

const paystackWebhookSchema = z.object({
  event: z.string(),
  data: z.object({
    reference: z.string().optional(),
    status: z.string().optional(),
    paid_at: z.string().optional()
  }).passthrough()
});

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

function mapTrustLayerEscrowStatus(status: string | undefined) {
  if (status === "FUNDED") return "FUNDED";
  if (status === "DELIVERED") return "DELIVERED";
  if (status === "DISPUTED") return "DISPUTED";
  if (status === "CONFIRMED") return "CONFIRMED";
  if (status === "COMPLETE") return "COMPLETE";
  if (status === "REFUNDED") return "REFUNDED";

  return undefined;
}

export async function registerWebhookRoutes(app: FastifyInstance): Promise<void> {
  app.post("/webhooks/paystack", { config: { rawBody: true } }, async (request, reply) => {
    const rawBody = (request as RawBodyRequest).rawBody ?? JSON.stringify(request.body ?? {});
    const signature = firstHeaderValue(request.headers["x-paystack-signature"]);

    if (
      !verifyPaystackSignature({
        payload: rawBody,
        signature,
        secret: process.env.PAYSTACK_SECRET_KEY
      })
    ) {
      void writeAuditLog({ request, action: "WEBHOOK_PAYSTACK_INVALID_SIGNATURE" });
      return reply.code(401).send({ error: "Invalid Paystack signature." });
    }

    const parsed = paystackWebhookSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid Paystack webhook payload." });
    }

    void writeAuditLog({
      request,
      action: "WEBHOOK_PAYSTACK_RECEIVED_TRANSITIONAL_NOOP",
      metadata: {
        event: parsed.data.event,
        reference: parsed.data.data.reference,
        boundary: "PAYSTACK_EVENTS_OWNED_BY_TRUSTLAYER"
      }
    });

    return { received: true, updatedSafeDeals: 0 };
  });

  app.post("/webhooks/trustlayer", { config: { rawBody: true } }, async (request, reply) => {
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
      return reply.code(401).send({ error: "Invalid TrustLayer signature." });
    }

    const parsed = trustLayerWebhookSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid TrustLayer webhook payload." });
    }

    const trustLayerEventId = parsed.data.eventId ?? parsed.data.id ?? crypto
      .createHash("sha256")
      .update(rawBody)
      .digest("hex");

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
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "P2002"
      ) {
        void writeAuditLog({
          request,
          action: "WEBHOOK_TRUSTLAYER_DUPLICATE_IGNORED",
          metadata: {
            event: parsed.data.event,
            eventId: trustLayerEventId
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

    if (userId || trustlayerUserId) {
      await prisma.user.updateMany({
        where: userId ? { id: userId } : { trustlayerUserId },
        data: {
          ...(verificationLevel !== undefined ? { verificationLevel } : {}),
          ...(trustScore !== undefined ? { trustScore } : {}),
          ...(trustTier !== undefined ? { trustTier } : {})
        }
      });
    }

    let updatedEscrows = 0;

    if (escrowId) {
      const mappedStatus = mapTrustLayerEscrowStatus(escrowStatus);

      if (mappedStatus) {
        const eventTime = syncedAt ? new Date(syncedAt) : new Date();

        const syncResult = await prisma.$transaction(async (tx) => {
          const existing = await tx.safeDeal.findFirst({
            where: {
              trustLayerEscrowId: escrowId
            }
          });

          if (!existing) {
            return { updatedCount: 0, settlementId: null as string | null, organizationId: null as string | null };
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

          if (mappedStatus !== "CONFIRMED" || wasAlreadyConfirmed) {
            return { updatedCount: 1, settlementId: null as string | null, organizationId: updated.organizationId };
          }

          const settlement = await createSettlementLedgerForConfirmedDeal({
            tx,
            safeDeal: {
              id: updated.id,
              sellerId: updated.sellerId,
              organizationId: updated.organizationId,
              amount: updated.amount,
              feeAmount: updated.feeAmount
            }
          });

          return { updatedCount: 1, settlementId: settlement.id, organizationId: updated.organizationId };
        });

        updatedEscrows = syncResult.updatedCount;

        if (syncResult.settlementId) {
          void writeAuditLog({
            request,
            organizationId: syncResult.organizationId,
            action: "SETTLEMENT_READY_FROM_TRUSTLAYER_WEBHOOK",
            entityType: "SAFE_DEAL",
            metadata: {
              escrowId,
              settlementId: syncResult.settlementId
            }
          });
        }
      }
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

    return {
      received: true,
      updatedEscrows
    };
  });
}
