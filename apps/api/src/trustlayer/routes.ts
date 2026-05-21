import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, requireAuthUser } from "../auth/middleware.js";
import { prisma } from "../database/client.js";
import { writeAuditLog } from "../audit/log.js";

const ghanaCardSchema = z.object({
  ghanaCardNumber: z.string().min(5).max(30)
});

type TrustLayerVerifyResponse = {
  status: "VERIFIED" | "REJECTED" | "PENDING";
  verificationLevel?: number;
  trustScore?: number;
  trustTier?: "NEW" | "BUILDING" | "VERIFIED" | "TRUSTED";
  reference?: string;
};

async function verifyGhanaCardWithTrustLayer(input: {
  userId: string;
  ghanaCardNumber: string;
}): Promise<TrustLayerVerifyResponse> {
  const apiKey = process.env.TRUSTLAYER_API_KEY;
  const baseUrl = process.env.TRUSTLAYER_API_URL;

  if (!apiKey || !baseUrl) {
    throw new Error("TrustLayer verification credentials are required.");
  }

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/verify/ghana-card`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });

  const data = (await response.json()) as TrustLayerVerifyResponse & {
    error?: string;
    message?: string;
  };

  if (!response.ok) {
    throw new Error(data.error ?? data.message ?? "TrustLayer Ghana Card verification failed.");
  }

  return data;
}

export async function registerTrustLayerRoutes(app: FastifyInstance): Promise<void> {
  app.get("/trustlayer/health", async () => {
    return {
      status: "ok",
      provider: "TrustLayer",
      configured: Boolean(process.env.TRUSTLAYER_API_KEY && process.env.TRUSTLAYER_API_URL)
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
        configured: Boolean(process.env.TRUSTLAYER_API_KEY && process.env.TRUSTLAYER_API_URL),
        provider: "TrustLayer",
        user
      }
    };
  });

  app.post("/verify/ghana-card", {
    preHandler: authenticate,
    config: {
      rateLimit: {
        max: 5,
        timeWindow: "1 hour"
      }
    }
  }, async (request, reply) => {
    const authUser = requireAuthUser(request);
    const parsed = ghanaCardSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({
        error: "Invalid Ghana Card verification payload."
      });
    }

    const verification = await verifyGhanaCardWithTrustLayer({
      userId: authUser.userId,
      ghanaCardNumber: parsed.data.ghanaCardNumber
    });

    if (verification.status !== "VERIFIED") {
      void writeAuditLog({ request, actorUserId: authUser.userId, action: "GHANA_CARD_VERIFICATION_PENDING", entityType: "USER", entityId: authUser.userId, metadata: { status: verification.status, reference: verification.reference } });

      return reply.code(202).send({
        verification: {
          provider: "TrustLayer",
          status: verification.status,
          reference: verification.reference
        }
      });
    }

    const user = await prisma.user.update({
      where: { id: authUser.userId },
      data: {
        verificationLevel: verification.verificationLevel ?? 3,
        trustScore: verification.trustScore ?? 750,
        trustTier: verification.trustTier ?? "VERIFIED"
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
        provider: "TrustLayer",
        status: "VERIFIED",
        reference: verification.reference,
        user
      }
    };
  });
}
