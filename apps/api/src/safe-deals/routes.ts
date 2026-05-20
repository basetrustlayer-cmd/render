import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../database/client.js";

const createSafeDealSchema = z.object({
  listingId: z.string().uuid(),
  buyerId: z.string().uuid()
});

export async function registerSafeDealRoutes(
  app: FastifyInstance
): Promise<void> {
  app.post("/safe-deals", async (request, reply) => {
    const parsed = createSafeDealSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({
        error: "Invalid Safe Deal payload."
      });
    }

    const listing = await prisma.listing.findUnique({
      where: { id: parsed.data.listingId }
    });

    if (!listing) {
      return reply.code(404).send({
        error: "Listing not found."
      });
    }

    if (listing.sellerId === parsed.data.buyerId) {
      return reply.code(400).send({
        error: "Buyer cannot purchase their own listing."
      });
    }

    const amount = listing.price;
    const feeAmount = Number(amount) * 0.015;

    const safeDeal = await prisma.safeDeal.create({
      data: {
        listingId: listing.id,
        buyerId: parsed.data.buyerId,
        sellerId: listing.sellerId,
        amount,
        feeAmount,
        status: "INITIATED"
      }
    });

    return reply.code(201).send({
      safeDeal,
      checkout: {
        provider: "PAYSTACK",
        authorizationUrl: `/safe-deal/${safeDeal.id}`
      }
    });
  });

  app.get("/safe-deals/:id", async (request, reply) => {
    const paramsSchema = z.object({
      id: z.string().uuid()
    });

    const parsed = paramsSchema.safeParse(request.params);

    if (!parsed.success) {
      return reply.code(400).send({
        error: "Invalid Safe Deal ID."
      });
    }

    const safeDeal = await prisma.safeDeal.findUnique({
      where: { id: parsed.data.id },
      include: {
        listing: true
      }
    });

    if (!safeDeal) {
      return reply.code(404).send({
        error: "Safe Deal not found."
      });
    }

    return { safeDeal };
  });
}
