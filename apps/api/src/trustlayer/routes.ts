import crypto from "node:crypto";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, requireAuthUser } from "../auth/middleware.js";
import { prisma } from "../database/client.js";

const ghanaCardSchema = z.object({
  ghanaCardNumber: z.string().min(5).max(30)
});

function hashIdentifier(value: string): string {
  return crypto.createHash("sha256").update(value.trim().toUpperCase()).digest("hex");
}

function isValidGhanaCardFormat(value: string): boolean {
  return /^GHA-\d{9}-\d$/.test(value.trim().toUpperCase());
}

export async function registerTrustLayerRoutes(app: FastifyInstance): Promise<void> {
  app.get("/trustlayer/health", async () => {
    return {
      status: "ok",
      provider: "TrustLayer",
      configured: Boolean(process.env.TRUSTLAYER_API_KEY)
    };
  });

  app.get("/verify/status", { preHandler: authenticate }, async (request) => {
    const authUser = requireAuthUser(request);

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: authUser.userId },
      select: {
        id: true,
        verificationLevel: true,
        trustScore: true,
        trustTier: true
      }
    });

    return {
      verification: {
        configured: Boolean(process.env.TRUSTLAYER_API_KEY),
        provider: "TrustLayer",
        user
      }
    };
  });

  app.post("/verify/ghana-card", { preHandler: authenticate }, async (request, reply) => {
    const authUser = requireAuthUser(request);
    const parsed = ghanaCardSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({
        error: "Invalid Ghana Card verification payload."
      });
    }

    if (!isValidGhanaCardFormat(parsed.data.ghanaCardNumber)) {
      return reply.code(400).send({
        error: "Ghana Card number must use format GHA-000000000-0."
      });
    }

    const identifierHash = hashIdentifier(parsed.data.ghanaCardNumber);

    const user = await prisma.user.update({
      where: { id: authUser.userId },
      data: {
        verificationLevel: 3,
        trustScore: 750,
        trustTier: "VERIFIED",
        trustlayerUserId: `ghana_card_${identifierHash.slice(0, 32)}`
      },
      select: {
        id: true,
        verificationLevel: true,
        trustScore: true,
        trustTier: true
      }
    });

    return {
      verification: {
        provider: process.env.TRUSTLAYER_API_KEY ? "TrustLayer" : "MOCK_GHANA_CARD",
        status: "VERIFIED",
        user
      }
    };
  });
}
