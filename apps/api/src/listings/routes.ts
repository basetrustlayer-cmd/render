import crypto from "node:crypto";
import { createTrustLayerClient } from "@render/trustlayer-sdk";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../database/client.js";
import { getSellerListingQuota } from "../billing/listing-quota.js";
import { authenticate, requireAuthUser } from "../auth/middleware.js";
import { writeAuditLog } from "../audit/log.js";
import { resolveOptionalOrganizationContext, requireListingOrganizationAccess } from "../organizations/context.js";

const listListingsQuerySchema = z.object({
  verifiedOnly: z.coerce.boolean().optional(),
  q: z.string().trim().max(100).optional(),
  category: z.enum([
    "VEHICLES",
    "REAL_ESTATE",
    "ELECTRONICS",
    "JOBS",
    "SERVICES",
    "FASHION"
  ]).optional(),
  locationRegion: z.string().trim().max(100).optional(),
  sort: z.enum([
    "newest",
    "price_asc",
    "price_desc"
  ]).default("newest")
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


function getTrustLayerClient() {
  const apiKey = process.env.TRUSTLAYER_API_KEY;
  const baseUrl = process.env.TRUSTLAYER_API_URL;

  if (!apiKey || !baseUrl) {
    throw new Error("TrustLayer listing risk credentials are required.");
  }

  return createTrustLayerClient({
    apiKey,
    baseUrl,
    maxRetries: 3,
    timeoutMs: 10_000
  });
}

function mapListingRiskDecisionToStatus(
  decision: "APPROVED" | "MANUAL_REVIEW" | "REJECTED"
): "LIVE" | "MANUAL_REVIEW" | "REJECTED" {
  if (decision === "APPROVED") return "LIVE";
  if (decision === "MANUAL_REVIEW") return "MANUAL_REVIEW";
  return "REJECTED";
}

function activeLiveListingWhere() {
  return {
    status: "LIVE" as const,
    deletedAt: null,
    OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }]
  };
}

function defaultListingExpiresAt(): Date {
  return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
}

const updateListingSchema = z.object({
  title: z.string().min(3).max(120).optional(),
  description: z.string().min(10).max(5000).optional(),
  price: z.coerce.number().positive().optional(),
  category: z.enum(["VEHICLES", "REAL_ESTATE", "ELECTRONICS", "JOBS", "SERVICES", "FASHION"]).optional(),
  condition: z.enum(["NEW", "LIKE_NEW", "GOOD", "FAIR"]).optional(),
  locationRegion: z.string().min(2).max(120).optional()
}).refine((value) => Object.keys(value).length > 0, {
  message: "At least one listing field is required."
});

const listingInclude = {
  images: {
    orderBy: [{ isCover: "desc" as const }, { sortOrder: "asc" as const }, { createdAt: "asc" as const }]
  },
  seller: {
    select: {
      verificationLevel: true,
      verificationStatusCached: true,
      trustScore: true,
      trustTier: true,
      trustBadgeCached: true,
      trustLastSyncedAt: true
    }
  }
};

export async function registerListingRoutes(app: FastifyInstance): Promise<void> {
  app.get("/listings", async (request, reply) => {
    const query = listListingsQuerySchema.safeParse(request.query);

    if (!query.success) {
      return reply.code(400).send({ error: "Invalid listings query." });
    }

    const orderBy =
      query.data.sort === "price_asc"
        ? { price: "asc" as const }
        : query.data.sort === "price_desc"
          ? { price: "desc" as const }
          : { createdAt: "desc" as const };

    const listings = await prisma.listing.findMany({
      where: {
        ...activeLiveListingWhere(),
        ...(query.data.q
          ? {
              OR: [
                { title: { contains: query.data.q } },
                { description: { contains: query.data.q } }
              ]
            }
          : {}),
        ...(query.data.category
          ? { category: query.data.category }
          : {}),
        ...(query.data.locationRegion
          ? {
              locationRegion: {
                contains: query.data.locationRegion
              }
            }
          : {}),
        ...(query.data.verifiedOnly
          ? {
              seller: {
                verificationLevel: { gte: 2 },
                isSuspended: false
              }
            }
          : {})
      },
      select: {
        id: true,
        sellerId: true,
        title: true,
        description: true,
        price: true,
        category: true,
        condition: true,
        locationRegion: true,
        createdAt: true,
        images: {
          orderBy: [
            { isCover: "desc" as const },
            { sortOrder: "asc" as const },
            { createdAt: "asc" as const }
          ],
          select: {
            id: true,
            url: true,
            isCover: true
          }
        },
        seller: {
          select: {
            verificationLevel: true,
            verificationStatusCached: true,
            trustScore: true,
            trustTier: true
          }
        }
      },
      orderBy
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


  app.get("/sellers/:id", async (request, reply) => {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const parsed = paramsSchema.safeParse(request.params);

    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid seller ID." });
    }

    const seller = await prisma.user.findUnique({
      where: { id: parsed.data.id },
      select: {
        id: true,
        verificationLevel: true,
        verificationStatusCached: true,
        trustScore: true,
        trustTier: true,
        trustBadgeCached: true,
        trustLastSyncedAt: true,
        isBusiness: true,
        isSuspended: true,
        createdAt: true,
        _count: {
          select: {
            listings: true,
            reviewsReceived: true,
            sales: true
          }
        }
      }
    });

    if (!seller || seller.isSuspended) {
      return reply.code(404).send({ error: "Seller not found." });
    }

    return {
      seller: {
        id: seller.id,
        displayName: seller.isBusiness ? "Verified Business Seller" : "Verified Render Seller",
        verificationLevel: seller.verificationLevel,
        verificationStatus: seller.verificationStatusCached ?? "Verification Pending",
        trustScore: seller.trustScore,
        trustTier: seller.trustTier,
        trustBadge: seller.trustBadgeCached,
        trustLastSyncedAt: seller.trustLastSyncedAt,
        reviewCount: seller._count.reviewsReceived,
        safeDealRequestCount: seller._count.sales,
        activeListings: seller._count.listings,
        memberSince: seller.createdAt
      }
    };
  });

  app.get("/sellers/:id/listings", async (request, reply) => {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const parsed = paramsSchema.safeParse(request.params);

    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid seller ID." });
    }

    const listings = await prisma.listing.findMany({
      where: {
        sellerId: parsed.data.id,
        ...activeLiveListingWhere(),
        seller: { isSuspended: false }
      },
      select: {
        id: true,
        sellerId: true,
        title: true,
        description: true,
        price: true,
        category: true,
        condition: true,
        locationRegion: true,
        createdAt: true,
        images: {
          orderBy: [
            { isCover: "desc" as const },
            { sortOrder: "asc" as const },
            { createdAt: "asc" as const }
          ],
          select: {
            id: true,
            url: true,
            isCover: true
          }
        },
        seller: {
          select: {
            verificationLevel: true,
            verificationStatusCached: true,
            trustScore: true,
            trustTier: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return { listings };
  });

  app.get("/sellers/:id/reviews", async (request, reply) => {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const parsed = paramsSchema.safeParse(request.params);

    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid seller ID." });
    }

    const seller = await prisma.user.findUnique({
      where: { id: parsed.data.id },
      select: {
        id: true,
        isSuspended: true
      }
    });

    if (!seller || seller.isSuspended) {
      return reply.code(404).send({ error: "Seller not found." });
    }

    const reviews = await prisma.review.findMany({
      where: {
        revieweeId: parsed.data.id
      },
      select: {
        id: true,
        rating: true,
        body: true,
        createdAt: true,
        reviewer: {
          select: {
            id: true,
            isBusiness: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 10
    });

    const aggregate = await prisma.review.aggregate({
      where: {
        revieweeId: parsed.data.id
      },
      _avg: {
        rating: true
      },
      _count: {
        rating: true
      }
    });

    return {
      summary: {
        averageRating: aggregate._avg.rating,
        reviewCount: aggregate._count.rating,
        source: "RENDER_BUYER_REVIEWS"
      },
      reviews: reviews.map((review) => ({
        id: review.id,
        rating: review.rating,
        body: review.body,
        createdAt: review.createdAt,
        reviewer: {
          id: review.reviewer.id,
          displayName: review.reviewer.isBusiness
            ? "Verified Business Buyer"
            : "Verified Render Buyer"
        }
      }))
    };
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
        ...activeLiveListingWhere()
      },
      include: {
        images: {
          orderBy: [{ isCover: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }]
        },
        seller: {
          select: {
            id: true,
            verificationLevel: true,
            verificationStatusCached: true,
            trustScore: true,
            trustTier: true,
            trustBadgeCached: true,
            trustLastSyncedAt: true,
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
      verificationStatus: listing.seller.verificationStatusCached ?? "Verification Pending",
      trustScore: listing.seller.trustScore,
      trustTier: listing.seller.trustTier,
      trustBadge: listing.seller.trustBadgeCached,
      trustLastSyncedAt: listing.seller.trustLastSyncedAt,
      reviewCount: listing.seller._count.reviewsReceived,
      safeDealRequestCount: listing.seller._count.sales,
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

    const quota = await getSellerListingQuota(prisma, {
      sellerId: authUser.userId,
      organizationId: organizationMembership?.organizationId ?? null
    });

    if (!quota.allowed) {
      return reply.code(402).send({
        error: "LISTING_LIMIT_REACHED",
        upgradeRequired: true,
        message: "Free seller listing limit reached. Upgrade or pay for additional listings.",
        plan: quota.plan,
        usage: {
          activeListings: quota.activeListings,
          activeListingLimit: quota.activeListingLimit,
          remainingListings: quota.remainingListings
        }
      });
    }

    const seller = await prisma.user.findUnique({
      where: { id: authUser.userId },
      select: { id: true, trustlayerUserId: true, verificationLevel: true }
    });

    if (!seller) {
      return reply.code(404).send({ error: "Seller not found." });
    }

    if (seller.verificationLevel < 2) {
      void writeAuditLog({
        request,
        actorUserId: authUser.userId,
        action: "LISTING_CREATE_BLOCKED_VERIFICATION_LEVEL",
        entityType: "USER",
        entityId: authUser.userId,
        metadata: { requiredVerificationLevel: 2, currentVerificationLevel: seller.verificationLevel }
      });

      return reply.code(403).send({ error: "Level 2 verification is required to create listings." });
    }

    const listing = await prisma.listing.create({
      data: {
        ...parsed.data,
        sellerId: authUser.userId,
        organizationId: organizationMembership?.organizationId,
        status: "PENDING",
        expiresAt: defaultListingExpiresAt()
      },
      include: listingInclude
    });

    const trustLayer = getTrustLayerClient();
    const riskAssessment = await trustLayer.assessListingRisk(
      {
        listingId: listing.id,
        sellerTlId: seller.trustlayerUserId,
        title: parsed.data.title,
        description: parsed.data.description,
        priceGhs: parsed.data.price,
        category: parsed.data.category,
        condition: parsed.data.condition,
        locationRegion: parsed.data.locationRegion,
        metadata: {
          renderListingId: listing.id,
          renderSellerId: authUser.userId,
          renderOrganizationId: organizationMembership?.organizationId ?? null
        }
      },
      {
        correlationId: request.id,
        idempotencyKey: `listing_risk_${listing.id}`
      }
    );

    const moderatedStatus = mapListingRiskDecisionToStatus(riskAssessment.decision);

    const moderatedListing = await prisma.listing.update({
      where: { id: listing.id },
      data: {
        status: moderatedStatus,
        fraudRiskScore: riskAssessment.riskScore
      },
      include: listingInclude
    });

    void writeAuditLog({
      request,
      actorUserId: authUser.userId,
      organizationId: organizationMembership?.organizationId,
      action: "LISTING_CREATED",
      entityType: "LISTING",
      entityId: listing.id,
      metadata: {
        initialStatus: "PENDING",
        moderatedStatus,
        riskDecision: riskAssessment.decision,
        riskScore: riskAssessment.riskScore,
        riskAssessmentId: riskAssessment.assessmentId
      }
    });

    return reply.code(201).send({
      listing: moderatedListing,
      riskAssessment: {
        decision: riskAssessment.decision,
        riskScore: riskAssessment.riskScore,
        reasons: riskAssessment.reasons ?? []
      },
      billing: {
        status: "FREE_PLAN_INCLUDED",
        planCode: quota.plan.code,
        activeListingLimit: quota.activeListingLimit,
        activeListingsAfterCreate: quota.activeListings + 1,
        currency: quota.plan.currency,
        message: `Free plan listing ${quota.activeListings + 1}/${quota.activeListingLimit} used.`
      }
    });
  });

  app.put("/listings/:id", { preHandler: authenticate }, async (request, reply) => {
    const authUser = requireAuthUser(request);
    const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
    const parsed = updateListingSchema.safeParse(request.body);

    if (!params.success || !parsed.success) {
      return reply.code(400).send({ error: "Invalid listing update payload." });
    }

    const listing = await prisma.listing.findFirst({
      where: {
        id: params.data.id,
        deletedAt: null
      },
      select: {
        id: true,
        sellerId: true,
        organizationId: true
      }
    });

    if (!listing) {
      return reply.code(404).send({ error: "Listing not found." });
    }

    if (listing.sellerId !== authUser.userId) {
      return reply.code(403).send({ error: "Only the listing owner can edit this listing." });
    }

    const updated = await prisma.listing.update({
      where: { id: listing.id },
      data: {
        ...parsed.data,
        status: "PENDING",
        fraudRiskScore: null
      },
      include: listingInclude
    });

    void writeAuditLog({
      request,
      actorUserId: authUser.userId,
      organizationId: listing.organizationId,
      action: "LISTING_UPDATED_BY_OWNER",
      entityType: "LISTING",
      entityId: listing.id,
      metadata: {
        updatedFields: Object.keys(parsed.data),
        moderationStatus: "PENDING"
      }
    });

    return { listing: updated };
  });

  app.get("/listings/:id/images", async (request, reply) => {
    const params = listingImageParamsSchema.safeParse(request.params);

    if (!params.success) {
      return reply.code(400).send({ error: "Invalid listing ID." });
    }

    const listing = await prisma.listing.findFirst({
      where: {
        id: params.data.id,
        ...activeLiveListingWhere()
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

  app.delete("/listings/:id/images/:imageId", { preHandler: authenticate }, async (request, reply) => {
    const authUser = requireAuthUser(request);
    const params = z.object({
      id: z.string().uuid(),
      imageId: z.string().uuid()
    }).safeParse(request.params);

    if (!params.success) {
      return reply.code(400).send({ error: "Invalid listing image ID." });
    }

    const image = await prisma.listingImage.findFirst({
      where: {
        id: params.data.imageId,
        listingId: params.data.id
      },
      include: {
        listing: {
          select: {
            id: true,
            sellerId: true,
            organizationId: true
          }
        }
      }
    });

    if (!image) {
      return reply.code(404).send({ error: "Listing image not found." });
    }

    if (image.listing.sellerId !== authUser.userId) {
      return reply.code(403).send({ error: "Only the listing owner can delete images." });
    }

    const hasOrganizationAccess = await requireListingOrganizationAccess({
      request,
      userId: authUser.userId,
      organizationId: image.listing.organizationId
    });

    if (!hasOrganizationAccess) {
      return reply.code(403).send({ error: "Invalid organization context." });
    }

    await prisma.listingImage.delete({
      where: { id: image.id }
    });

    if (image.isCover) {
      const nextImage = await prisma.listingImage.findFirst({
        where: { listingId: image.listing.id },
        orderBy: [
          { sortOrder: "asc" },
          { createdAt: "asc" }
        ]
      });

      if (nextImage) {
        await prisma.listingImage.update({
          where: { id: nextImage.id },
          data: { isCover: true }
        });
      }
    }

    void writeAuditLog({
      request,
      actorUserId: authUser.userId,
      action: "LISTING_IMAGE_DELETED",
      entityType: "LISTING",
      entityId: image.listing.id,
      metadata: { imageId: image.id }
    });

    return { ok: true };
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
