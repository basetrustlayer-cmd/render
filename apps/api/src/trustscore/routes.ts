import type { FastifyInstance } from "fastify";
import { z } from "zod";

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

    const score = 500;
    const tier = calculateTrustTier(score);

    return {
      userId: params.data.id,
      score,
      tier,
      components: {
        identityCompleteness: 0,
        transactionHistory: 0,
        peerReviews: 0,
        disputeRecord: 0,
        platformTenure: 0
      }
    };
  });
}
