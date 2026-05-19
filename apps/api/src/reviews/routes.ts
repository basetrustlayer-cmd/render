import type { FastifyInstance } from "fastify";
import { z } from "zod";

const createReviewSchema = z.object({
  safeDealId: z.string().uuid(),
  reviewerId: z.string().uuid(),
  revieweeId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  body: z.string().max(2000).optional()
});

export async function registerReviewRoutes(app: FastifyInstance): Promise<void> {
  app.post("/reviews", async (request, reply) => {
    const parsed = createReviewSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid review payload." });
    }

    return reply.code(501).send({
      error: "Review persistence is pending Prisma client generation in CI/Render.",
      review: parsed.data
    });
  });

  app.get("/users/:id/reviews", async (request, reply) => {
    const params = z.object({
      id: z.string().uuid()
    }).safeParse(request.params);

    if (!params.success) {
      return reply.code(400).send({ error: "Invalid user ID." });
    }

    return {
      userId: params.data.id,
      reviews: []
    };
  });
}
