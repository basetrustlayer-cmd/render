import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, requireAuthUser } from "../auth/middleware.js";
import { prisma } from "../database/client.js";

function calculateTrustTier(score: number): "NEW" | "BUILDING" | "VERIFIED" | "TRUSTED" {
  if (score >= 900) return "TRUSTED";
  if (score >= 750) return "VERIFIED";
  if (score >= 500) return "BUILDING";
  return "NEW";
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(1000, Math.round(score)));
}

export async function registerTrustScoreRoutes(app: FastifyInstance): Promise<void> {
  app.get("/users/:id/trust-score", { preHandler: authenticate }, async (request, reply) => {
    const authUser = requireAuthUser(request);
    const params = z.object({
      id: z.string().uuid()
    }).safeParse(request.params);

    if (!params.success) {
      return reply.code(400).send({ error: "Invalid user ID." });
    }

    if (params.data.id !== authUser.userId) {
      return reply.code(403).send({ error: "You can only view your own TrustScore." });
    }

    const user = await prisma.user.findUnique({
      where: { id: params.data.id },
      select: {
        id: true,
        verificationLevel: true,
        trustScore: true,
        trustTier: true,
        createdAt: true,
        _count: {
          select: {
            listings: true,
            purchases: true,
            sales: true,
            reviewsReceived: true
          }
        }
      }
    });

    if (!user) {
      return reply.code(404).send({ error: "User not found." });
    }

    const identityCompleteness = Math.min(250, user.verificationLevel * 125);
    const transactionHistory = Math.min(250, (user._count.purchases + user._count.sales) * 50);
    const peerReviews = Math.min(200, user._count.reviewsReceived * 40);
    const disputeRecord = 200;
    const platformTenure = Math.min(
      100,
      Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)) * 2
    );

    const computedScore = clampScore(
      identityCompleteness +
        transactionHistory +
        peerReviews +
        disputeRecord +
        platformTenure
    );

    const score = user.trustScore ?? computedScore;
    const tier = user.trustTier ?? calculateTrustTier(score);

    return {
      userId: user.id,
      score,
      tier,
      verificationLevel: user.verificationLevel,
      memberSince: user.createdAt,
      source: user.trustScore === null ? "PLATFORM_FALLBACK" : "USER_RECORD",
      components: {
        identityCompleteness,
        transactionHistory,
        peerReviews,
        disputeRecord,
        platformTenure
      }
    };
  });
}
