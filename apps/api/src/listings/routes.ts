import crypto from "node:crypto";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../database/client.js";
import { authenticate, requireAuthUser } from "../auth/middleware.js";
import { writeAuditLog } from "../audit/log.js";
import { resolveOptionalOrganizationContext, requireListingOrganizationAccess } from "../organizations/context.js";

const listListingsQuerySchema = z.object({
  verifiedOnly: z.coerce.boolean().optional(),
  q: z.string().trim().max(100).optional()
});

const createListingSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().optional(),
  price: z.number().positive(),
  category: z.enum(["VEHICLES", "REAL_ESTATE", "ELECTRONICS", "JOBS", "SERVICES", "FASHION"]),
  condition: z.enum(["NEW", "LIKE_NEW", "GOOD", "FAIR"]).optional(),
  locationRegion: z.string().max(100).optional()
});

const listingImageParamsSchema = z.object({
  id: z.string().uuid()
});

const createListingImageSchema = z.object({
  url: z.string().url(),
  cloudinaryId: z.string().min(1).max(200),
  isCover: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(20).optional()
});

const listingInclude = {
  images: {
    orderBy: [{ isCover: "desc" as const }, { sortOrder: "asc" as const }, { createdAt: "asc" as const }]
  },
  seller: {
    select: {
      verificationLevel: true,
      trustScore: true,
      trustTier: true
    }
  }
};

export async function registerListingRoutes(app: FastifyInstance): Promise<void> {
  app.get("/listings", async (request, reply) => {
    const query = listListingsQuerySchema.safeParse(request.query);

    if (!query.success) {
      return reply.code(400).send({ error: "Invalid listings query." });
    }

    const listings = await prisma.listing.findMany({
      where: {
        status: "LIVE",
        deletedAt: null,
        ...(query.data.q
          ? {
              OR: [
                { title: { contains: query.data.q } },
                { description: { contains: query.data.q } }
              ]
            }
          : {}),
        ...(query.data.verifiedOnly
          ? { seller: { verificationLevel: { gte: 1 } } }
          : {})
      },
      select: {
        id: true,
        title: true,
        description: true,
        price: true,
        category: true,
        condition: true,
        locationRegion: true,
        createdAt: true
      },
      orderBy: { createdAt: "desc" }
    });

    return { listings };
  });

  app.get("/listings/my", { preHandler: authenticate }, async (request) => {
    const authUser = requireAuthUser(request);

    const listings = await prisma.listing.findMany({
      where: {
        sellerId: authUser.userId,
        deletedAt: null
      },
      include: listingInclude,
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

    const listing = await prisma.listing.findFirst({
      where: {
        id: parsed.data.id,
        deletedAt: null,
        status: "LIVE"
      },
      include: {
        images: {
          orderBy: [{ isCover: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }]
        },
        seller: {
          select: {
            id: true,
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
      whatsappNumber: listing.seller.whatsappNumber,
      verificationLevel: listing.seller.verificationLevel,
      verificationStatus:
        listing.seller.verificationLevel >= 1
          ? "Identity Verified"
          : "Verification Pending",
      trustScore: listing.seller.trustScore ?? 500,
      trustTier: listing.seller.trustTier ?? "NEW",
      reviewCount: listing.seller._count.reviewsReceived,
      completedDeals: listing.seller._count.sales,
      activeListings: listing.seller._count.listings,
      memberSince: listing.seller.createdAt
    };

    return { listing, seller };
  });

  app.post("/listings", { preHandler: authenticate }, async (request, reply) => {
    const authUser = requireAuthUser(request);
    const parsed = createListingSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid listing payload." });
    }

    const organizationMembership = await resolveOptionalOrganizationContext({
      request,
      userId: authUser.userId
    });

    const requestedOrganizationId = request.headers["x-render-organization-id"];

    if (requestedOrganizationId && !organizationMembership) {
      return reply.code(403).send({ error: "Invalid organization context." });
    }

    const listing = await prisma.listing.create({
      data: {
        ...parsed.data,
        sellerId: authUser.userId,
        organizationId: organizationMembership?.organizationId,
        status: "PENDING"
      },
      include: listingInclude
    });

    void writeAuditLog({ request, actorUserId: authUser.userId, organizationId: organizationMembership?.organizationId, action: "LISTING_CREATED", entityType: "LISTING", entityId: listing.id });

    return reply.code(201).send({ listing });
  });

  app.get("/listings/:id/images", async (request, reply) => {
    const params = listingImageParamsSchema.safeParse(request.params);

    if (!params.success) {
      return reply.code(400).send({ error: "Invalid listing ID." });
    }

    const listing = await prisma.listing.findFirst({
      where: {
        id: params.data.id,
        deletedAt: null,
        status: "LIVE"
      },
      select: { id: true }
    });

    if (!listing) {
      return reply.code(404).send({ error: "Listing not found." });
    }

    const images = await prisma.listingImage.findMany({
      where: { listingId: listing.id },
      orderBy: [{ isCover: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }]
    });

    return { images };
  });


  app.post("/listings/:id/images/signature", { preHandler: authenticate }, async (request, reply) => {
    const authUser = requireAuthUser(request);
    const params = listingImageParamsSchema.safeParse(request.params);

    if (!params.success) {
      return reply.code(400).send({ error: "Invalid listing ID." });
    }

    const listing = await prisma.listing.findUnique({
      where: { id: params.data.id },
      select: { id: true, sellerId: true, organizationId: true }
    });

    if (!listing) {
      return reply.code(404).send({ error: "Listing not found." });
    }

    if (listing.sellerId !== authUser.userId) {
      return reply.code(403).send({ error: "Only the listing owner can upload images." });
    }

    const hasOrganizationAccess = await requireListingOrganizationAccess({
      request,
      userId: authUser.userId,
      organizationId: listing.organizationId
    });

    if (!hasOrganizationAccess) {
      return reply.code(403).send({ error: "Invalid organization context." });
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiSecret) {
      return reply.code(500).send({ error: "Cloudinary environment variables are required." });
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const folder = `render/listings/${listing.id}`;
    const signaturePayload = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash("sha1").update(signaturePayload).digest("hex");

    return {
      cloudName,
      timestamp,
      folder,
      signature,
      uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`
    };
  });

  app.post("/listings/:id/images", { preHandler: authenticate }, async (request, reply) => {
    const authUser = requireAuthUser(request);
    const params = listingImageParamsSchema.safeParse(request.params);
    const body = createListingImageSchema.safeParse(request.body);

    if (!params.success) {
      return reply.code(400).send({ error: "Invalid listing ID." });
    }

    if (!body.success) {
      return reply.code(400).send({ error: "Invalid image payload." });
    }

    const listing = await prisma.listing.findUnique({
      where: { id: params.data.id },
      select: { id: true, sellerId: true, organizationId: true }
    });

    if (!listing) {
      return reply.code(404).send({ error: "Listing not found." });
    }

    if (listing.sellerId !== authUser.userId) {
      return reply.code(403).send({ error: "Only the listing owner can add images." });
    }

    const hasOrganizationAccess = await requireListingOrganizationAccess({
      request,
      userId: authUser.userId,
      organizationId: listing.organizationId
    });

    if (!hasOrganizationAccess) {
      return reply.code(403).send({ error: "Invalid organization context." });
    }

    const imageCount = await prisma.listingImage.count({
    where: { listingId: listing.id }
  });

  if (imageCount >= 10) {
    return reply.code(400).send({ error: "Maximum 10 images per listing." });
  }

  if (body.data.isCover) {
      await prisma.listingImage.updateMany({
        where: { listingId: listing.id },
        data: { isCover: false }
      });
    }

    const image = await prisma.listingImage.create({
      data: {
        listingId: listing.id,
        url: body.data.url,
        cloudinaryId: body.data.cloudinaryId,
        isCover: body.data.isCover ?? false,
        sortOrder: body.data.sortOrder ?? 0
      }
    });

    void writeAuditLog({ request, actorUserId: authUser.userId, action: "LISTING_IMAGE_ADDED", entityType: "LISTING", entityId: listing.id, metadata: { imageId: image.id } });

    return reply.code(201).send({ image });
  });
}
