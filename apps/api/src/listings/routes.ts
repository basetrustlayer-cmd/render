import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../database/client.js";

const createListingSchema = z.object({
  sellerId: z.string().uuid(),
  title: z.string().min(3).max(200),
  description: z.string().optional(),
  price: z.number().positive(),
  category: z.enum(["VEHICLES", "REAL_ESTATE", "ELECTRONICS", "JOBS", "SERVICES", "FASHION"]),
  condition: z.enum(["NEW", "LIKE_NEW", "GOOD", "FAIR"]).optional(),
  locationRegion: z.string().max(100).optional()
});

export async function registerListingRoutes(app: FastifyInstance): Promise<void> {
  app.get("/listings", async () => {
    const listings = await prisma.listing.findMany({
      orderBy: { createdAt: "desc" },
      take: 50
    });

    return { listings };
  });

  app.get("/listings/:id", async (request, reply) => {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const parsed = paramsSchema.safeParse(request.params);

    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid listing ID." });
    }

    const listing = await prisma.listing.findUnique({
      where: { id: parsed.data.id }
    });

    if (!listing) {
      return reply.code(404).send({ error: "Listing not found." });
    }

    return { listing };
  });

  app.post("/listings", async (request, reply) => {
    const parsed = createListingSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid listing payload." });
    }

    const listing = await prisma.listing.create({
      data: {
        ...parsed.data,
        status: "PENDING"
      }
    });

    return reply.code(201).send({ listing });
  });
}
