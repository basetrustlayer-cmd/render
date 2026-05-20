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
      where: { id: parsed.data.id },
      include: {
        seller: {
          select: {
            id: true,
            phone: true,
            email: true,
            verificationLevel: true,
            trustScore: true,
            trustTier: true,
            isBusiness: true,
            whatsappNumber: true,
            createdAt: true,
            _count: {
              select: {
                listings: true,
                reviewsReceived: true,
                sales: true
              }
            }
          }
        }
      }
    });

    if (!listing) {
      return reply.code(404).send({ error: "Listing not found." });
    }

    const seller = {
      id: listing.seller.id,
      displayName: listing.seller.isBusiness
        ? "Verified Business Seller"
        : "Verified Render Seller",
      phone: listing.seller.phone,
      email: listing.seller.email,
      whatsappNumber: listing.seller.whatsappNumber,
      verificationLevel: listing.seller.verificationLevel,
      verificationStatus:
        listing.seller.verificationLevel >= 1
          ? "Identity Verified"
          : "Verification Pending",
      trustScore: listing.seller.trustScore ?? 75,
      trustTier: listing.seller.trustTier ?? "BRONZE",
      reviewCount: listing.seller._count.reviewsReceived,
      completedDeals: listing.seller._count.sales,
      activeListings: listing.seller._count.listings,
      memberSince: listing.seller.createdAt
    };

    return { listing, seller };
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
