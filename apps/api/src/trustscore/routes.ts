import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../database/client.js";

function calculateTrustTier(score: number): "NEW" | "BUILDING" | "VERIFIED" | "TRUSTED" {
  if (score >= 900) return "TRUSTED";
  if (score >= 750) return "VERIFIED";
  if (score >= 500) return "BUILDING";
  return "NEW";
}

export async function registerTrustScoreRoutes(app: FastifyInstance): Promise<void> {
  app.get("/users/:id/trust-score", async (request, reply) => {
    const params = z.object({
      id: z.string().uuid()
    }).safeParse(request.params);

    if (!params.success) {
      return reply.code(400).send({ error: "Invalid user ID." });
    }

    const user = await prisma.user.findUnique({
      where: { id: params.data.id },
      select: {
        trustScore: true,
        trustTier: true,
        verificationLevel: true,
        createdAt: true
      }
    });

    if (!user) {
      return reply.code(404).send({ error: "User not found." });
    }

    const score = user.trustScore ?? 0;
    const tier = user.trustTier ?? calculateTrustTier(score);

    return {
      userId: params.data.id,
      score,
      tier,
      verificationLevel: user.verificationLevel,
      memberSince: user.createdAt,
      components: {
        identityCompleteness: user.verificationLevel > 0 ? 100 : 0,
        transactionHistory: 0,
        peerReviews: 0,
        disputeRecord: 0,
        platformTenure: 0
      }
    };
  });
}
