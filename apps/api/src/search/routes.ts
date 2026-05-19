import type { FastifyInstance } from "fastify";
import { z } from "zod";

const listingSearchSchema = z.object({
  q: z.string().min(1).max(120).optional(),
  category: z.enum(["VEHICLES", "REAL_ESTATE", "ELECTRONICS", "JOBS", "SERVICES", "FASHION"]).optional(),
  city: z.string().min(1).max(100).optional(),
  minPrice: z.coerce.number().positive().optional(),
  maxPrice: z.coerce.number().positive().optional(),
  verifiedOnly: z.coerce.boolean().optional(),
  sortBy: z.enum(["relevance", "newest", "price_asc", "price_desc", "trust_score"]).default("relevance")
});

export async function registerSearchRoutes(app: FastifyInstance): Promise<void> {
  app.get("/search/listings", async (request, reply) => {
    const parsed = listingSearchSchema.safeParse(request.query);

    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid search query." });
    }

    return {
      query: parsed.data,
      results: [],
      meta: {
        total: 0,
        provider: "placeholder",
        note: "OpenSearch-backed listing search pending integration."
      }
    };
  });
}
