import { createTrustLayerClient } from "@render/trustlayer-sdk";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, requireAuthUser } from "../auth/middleware.js";
import { prisma } from "../database/client.js";

function getTrustLayerClient() {
  const apiKey = process.env.TRUSTLAYER_API_KEY;
  const baseUrl = process.env.TRUSTLAYER_API_URL;

  if (!apiKey || !baseUrl) {
    throw new Error("TrustLayer TrustScore credentials are required.");
  }

  return createTrustLayerClient({
    apiKey,
    baseUrl,
    maxRetries: 3,
    timeoutMs: 10_000
  });
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
        trustlayerUserId: true,
        verificationLevel: true,
        createdAt: true
      }
    });

    if (!user) {
      return reply.code(404).send({ error: "User not found." });
    }

    const trustLayer = getTrustLayerClient();
    const trustScore = await trustLayer.getTrustScore(user.trustlayerUserId, {
      correlationId: request.id
    });

    return {
      userId: user.id,
      score: trustScore.trustScore,
      tier: trustScore.trustTier,
      verificationLevel: user.verificationLevel,
      memberSince: user.createdAt,
      source: "TRUSTLAYER",
      trustLayer: trustScore
    };
  });
}
