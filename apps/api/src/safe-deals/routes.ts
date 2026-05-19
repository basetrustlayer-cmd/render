import type { FastifyInstance } from "fastify";
import { z } from "zod";

const createSafeDealSchema = z.object({
  listingId: z.string().uuid(),
  buyerId: z.string().uuid(),
  sellerId: z.string().uuid(),
  amount: z.number().positive()
});

const safeDealIdParams = z.object({
  id: z.string().uuid()
});

const disputeSchema = z.object({
  reason: z.string().min(5).max(2000),
  evidenceUrls: z.array(z.string().url()).optional()
});

export async function registerSafeDealRoutes(app: FastifyInstance): Promise<void> {
  app.post("/safe-deals", async (request, reply) => {
    const parsed = createSafeDealSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid Safe Deal payload." });
    }

    const feeAmount = parsed.data.amount * 0.015;

    return reply.code(501).send({
      error: "Safe Deal persistence is pending Prisma client generation in CI/Render.",
      safeDeal: {
        ...parsed.data,
        feeAmount,
        status: "INITIATED"
      }
    });
  });

  app.get("/safe-deals/:id", async (request, reply) => {
    const params = safeDealIdParams.safeParse(request.params);

    if (!params.success) {
      return reply.code(400).send({ error: "Invalid Safe Deal ID." });
    }

    return {
      safeDeal: {
        id: params.data.id,
        status: "INITIATED"
      }
    };
  });

  app.post("/safe-deals/:id/fund", async (request, reply) => {
    const params = safeDealIdParams.safeParse(request.params);

    if (!params.success) {
      return reply.code(400).send({ error: "Invalid Safe Deal ID." });
    }

    return reply.code(501).send({
      error: "Paystack funding integration pending.",
      safeDealId: params.data.id,
      nextStatus: "FUNDED"
    });
  });

  app.post("/safe-deals/:id/confirm", async (request, reply) => {
    const params = safeDealIdParams.safeParse(request.params);

    if (!params.success) {
      return reply.code(400).send({ error: "Invalid Safe Deal ID." });
    }

    return reply.code(501).send({
      error: "Safe Deal payout integration pending.",
      safeDealId: params.data.id,
      nextStatus: "CONFIRMED"
    });
  });

  app.post("/safe-deals/:id/dispute", async (request, reply) => {
    const params = safeDealIdParams.safeParse(request.params);
    const body = disputeSchema.safeParse(request.body);

    if (!params.success) {
      return reply.code(400).send({ error: "Invalid Safe Deal ID." });
    }

    if (!body.success) {
      return reply.code(400).send({ error: "Invalid dispute payload." });
    }

    return reply.code(501).send({
      error: "TrustLayer dispute integration pending.",
      safeDealId: params.data.id,
      dispute: body.data,
      nextStatus: "DISPUTED"
    });
  });
}
