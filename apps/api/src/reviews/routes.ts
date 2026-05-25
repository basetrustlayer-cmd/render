import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, requireAuthUser } from "../auth/middleware.js";
import { prisma } from "../database/client.js";
import { getRequestedOrganizationId, requireActiveOrganizationMembership } from "../organizations/context.js";
import { writeAuditLog } from "../audit/log.js";

const createReviewSchema = z.object({
  safeDealId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  body: z.string().trim().max(2000).optional()
});

export async function registerReviewRoutes(app: FastifyInstance): Promise<void> {
  app.post("/reviews", { preHandler: authenticate }, async (request, reply) => {
    const authUser = requireAuthUser(request);
    const parsed = createReviewSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid review payload." });
    }

    const requestedOrganizationId = getRequestedOrganizationId(request);

    if (requestedOrganizationId) {
      const membership = await requireActiveOrganizationMembership({
        userId: authUser.userId,
        organizationId: requestedOrganizationId
      });

      if (!membership) {
        return reply.code(403).send({ error: "Invalid organization context." });
      }
    }

    const safeDeal = await prisma.safeDeal.findFirst({
      where: {
        id: parsed.data.safeDealId,
        organizationId: requestedOrganizationId ?? null
      },
      include: {
        review: true
      }
    });

    if (!safeDeal) {
      return reply.code(404).send({ error: "Safe Deal not found." });
    }

    if (safeDeal.buyerId !== authUser.userId) {
      return reply.code(403).send({ error: "Only the buyer can review this Safe Deal." });
    }

    if (!["CONFIRMED", "COMPLETE"].includes(safeDeal.escrowStatusCached ?? "")) {
      return reply.code(400).send({ error: "Only confirmed or completed Safe Deals can be reviewed." });
    }

    if (safeDeal.review) {
      return reply.code(409).send({ error: "A review already exists for this Safe Deal." });
    }

    const review = await prisma.review.create({
      data: {
        safeDealId: safeDeal.id,
        reviewerId: authUser.userId,
        revieweeId: safeDeal.sellerId,
        rating: parsed.data.rating,
        body: parsed.data.body
      }
    });

    void writeAuditLog({
      request,
      actorUserId: authUser.userId,
      organizationId: safeDeal.organizationId,
      action: "REVIEW_CREATED",
      entityType: "REVIEW",
      entityId: review.id,
      metadata: {
        safeDealId: safeDeal.id,
        sellerId: safeDeal.sellerId,
        rating: parsed.data.rating
      }
    });

    return reply.code(201).send({ review });
  });


  app.post("/reviews/:id/report", { preHandler: authenticate }, async (request, reply) => {
    const authUser = requireAuthUser(request);
    const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
    const body = z.object({ reason: z.string().trim().min(5).max(1000) }).safeParse(request.body);

    if (!params.success || !body.success) {
      return reply.code(400).send({ error: "Invalid review report payload." });
    }

    const review = await prisma.review.findUnique({
      where: { id: params.data.id },
      select: {
        id: true,
        safeDealId: true,
        reviewerId: true,
        revieweeId: true
      }
    });

    if (!review) {
      return reply.code(404).send({ error: "Review not found." });
    }

    void writeAuditLog({
      request,
      actorUserId: authUser.userId,
      action: "REVIEW_REPORTED",
      entityType: "REVIEW",
      entityId: review.id,
      metadata: {
        safeDealId: review.safeDealId,
        reviewerId: review.reviewerId,
        revieweeId: review.revieweeId,
        reason: body.data.reason
      }
    });

    return reply.code(202).send({
      reported: true,
      reviewId: review.id
    });
  });

  app.get("/users/:id/reviews", async (request, reply) => {
    const params = z.object({
      id: z.string().uuid()
    }).safeParse(request.params);

    if (!params.success) {
      return reply.code(400).send({ error: "Invalid user ID." });
    }

    const reviews = await prisma.review.findMany({
      where: { revieweeId: params.data.id },
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
      take: 25
    });

    return {
      userId: params.data.id,
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
}
