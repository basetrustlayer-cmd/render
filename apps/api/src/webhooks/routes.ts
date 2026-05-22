import crypto from "node:crypto";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../database/client.js";
import { verifyPaystackSignature } from "../payments/paystack.js";
import { writeAuditLog } from "../audit/log.js";

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
  event: z.string(),
  data: z.object({
    userId: z.string().uuid().optional(),
    trustlayerUserId: z.string().optional(),
    verificationLevel: z.number().int().min(0).max(5).optional(),
    trustScore: z.number().int().min(0).max(1000).optional(),
    trustTier: z.enum(["NEW", "BUILDING", "VERIFIED", "TRUSTED"]).optional()
  }).passthrough()
});

type RawBodyRequest = {
  rawBody?: string;
};

function firstHeaderValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
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

    let updatedSafeDeals = 0;

    if (parsed.data.event === "charge.success" && parsed.data.data.reference) {
      const paidAt = parsed.data.data.paid_at ? new Date(parsed.data.data.paid_at) : new Date();

      void paidAt;
      updatedSafeDeals = 0;
    }

    void writeAuditLog({
      request,
      action: "WEBHOOK_PAYSTACK_RECEIVED",
      metadata: {
        event: parsed.data.event,
        reference: parsed.data.data.reference,
        updatedSafeDeals
      }
    });

    return { received: true, updatedSafeDeals };
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

    const { userId, trustlayerUserId, verificationLevel, trustScore, trustTier } = parsed.data.data;

    void writeAuditLog({
      request,
      actorUserId: userId,
      action: "WEBHOOK_TRUSTLAYER_RECEIVED",
      entityType: userId ? "USER" : undefined,
      entityId: userId,
      metadata: { event: parsed.data.event, trustlayerUserId }
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

    return { received: true };
  });
}
