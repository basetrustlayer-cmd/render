import { createTrustLayerClient } from "@render/trustlayer-sdk";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../database/client.js";
import { authenticate, requireAuthUser } from "../auth/middleware.js";
import { writeAuditLog } from "../audit/log.js";
import { getRequestedOrganizationId, requireActiveOrganizationMembership } from "../organizations/context.js";
import { createRiskSignal } from "@render/risk";
import { getSafeDealProjectionFreshness } from "./projection-freshness.js";


function requireFreshEscrowProjection(lastSyncedAt: Date | string | null | undefined): { ok: true } | { ok: false; error: string; state: string } {
  const freshness = getSafeDealProjectionFreshness({ lastSyncedAt });

  if (freshness.state !== "FRESH") {
    return {
      ok: false,
      state: freshness.state,
      error: `Safe Deal escrow projection is ${freshness.state}. Wait for TrustLayer webhook sync before sending this command.`
    };
  }

  return { ok: true };
}

const createSafeDealSchema = z.object({
  listingId: z.string().uuid()
});

const safeDealProjectionCacheFields = {
  disputeStatusCached: true,
  disputeReasonCached: true,
  disputeLastSyncedAt: true
} as const;


function getTrustLayerClient() {
  const apiKey = process.env.TRUSTLAYER_API_KEY;
  const baseUrl = process.env.TRUSTLAYER_API_URL;

  if (!apiKey || !baseUrl) {
    throw new Error("TrustLayer SafeDeal credentials are required.");
  }

  return createTrustLayerClient({
    apiKey,
    baseUrl,
    maxRetries: 3,
    timeoutMs: 10_000
  });
}

export async function registerSafeDealRoutes(
  app: FastifyInstance
): Promise<void> {
  app.post("/safe-deals", { preHandler: authenticate }, async (request, reply) => {
    const authUser = requireAuthUser(request);
    const parsed = createSafeDealSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({
        error: "Invalid Safe Deal payload."
      });
    }

    const requestedOrganizationId = getRequestedOrganizationId(request);

    const listing = await prisma.listing.findFirst({
      where: {
        id: parsed.data.listingId,
        deletedAt: null,
        status: "LIVE",
        organizationId: requestedOrganizationId ?? null
      }
    });

    const buyer = await prisma.user.findUnique({
      where: { id: authUser.userId },
      select: {
        id: true,
        trustlayerUserId: true
      }
    });

    if (!listing) {
      return reply.code(404).send({
        error: "Listing not found."
      });
    }

    if (listing.organizationId) {
      if (requestedOrganizationId !== listing.organizationId) {
        return reply.code(403).send({ error: "Invalid organization context for this listing." });
      }

      const membership = await requireActiveOrganizationMembership({
        userId: authUser.userId,
        organizationId: listing.organizationId
      });

      if (!membership) {
        return reply.code(403).send({ error: "Buyer is not a member of this organization context." });
      }
    }

    if (listing.sellerId === authUser.userId) {
      return reply.code(400).send({
        error: "Buyer cannot purchase their own listing."
      });
    }

    if (!buyer) {
      return reply.code(404).send({
        error: "Buyer not found."
      });
    }

    const seller = await prisma.user.findUnique({
      where: { id: listing.sellerId },
      select: {
        id: true,
        trustlayerUserId: true
      }
    });

    if (!seller) {
      return reply.code(404).send({
        error: "Seller not found."
      });
    }

    const amount = listing.price;
    const amountNumber = Number(amount);
    const trustLayer = getTrustLayerClient();

    const intent = await trustLayer.createSafeDealIntent(
      {
        buyerTlId: buyer.trustlayerUserId,
        sellerTlId: seller.trustlayerUserId,
        listingId: listing.id,
        amountGhs: amountNumber,
        metadata: {
          renderListingId: listing.id,
          renderBuyerId: authUser.userId,
          renderSellerId: listing.sellerId
        }
      },
      {
        correlationId: request.id,
        idempotencyKey: `safedeal_intent_${authUser.userId}_${listing.id}`
      }
    );

    const safeDeal = await prisma.safeDeal.create({
      data: {
        listingId: listing.id,
        buyerId: authUser.userId,
        sellerId: listing.sellerId,
        organizationId: listing.organizationId,
        escrowAmountCached: amount,
        escrowFeeCached: 0,
        trustLayerEscrowId: intent.escrowId,
        checkoutUrl: intent.paymentUrl,
        escrowStatusCached: intent.status,
        escrowLastSyncedAt: new Date()
      }
    });

    void writeAuditLog({ request, actorUserId: authUser.userId, organizationId: listing.organizationId, action: "SAFE_DEAL_INTENT_CREATED", entityType: "SAFE_DEAL", entityId: safeDeal.id, metadata: { listingId: listing.id, sellerId: listing.sellerId, trustLayerEscrowId: intent.escrowId } });

    void writeAuditLog({ request, actorUserId: authUser.userId, organizationId: listing.organizationId, action: "SAFE_DEAL_INITIATED", entityType: "SAFE_DEAL", entityId: safeDeal.id, metadata: { listingId: listing.id, sellerId: listing.sellerId } });

    return reply.code(201).send({
      safeDeal,
      checkout: {
        provider: "TRUSTLAYER",
        authorizationUrl: intent.paymentUrl,
        escrowId: intent.escrowId,
        status: intent.status
      }
    });
  });

  app.get("/safe-deals/my", { preHandler: authenticate }, async (request) => {
    const authUser = requireAuthUser(request);
    const requestedOrganizationId = getRequestedOrganizationId(request);

    if (requestedOrganizationId) {
      const membership = await requireActiveOrganizationMembership({
        userId: authUser.userId,
        organizationId: requestedOrganizationId
      });

      if (!membership) {
        return { safeDeals: [] };
      }
    }

    const safeDeals = await prisma.safeDeal.findMany({
      where: {
        organizationId: requestedOrganizationId ?? null,
        OR: [
          { buyerId: authUser.userId },
          { sellerId: authUser.userId }
        ]
      },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            price: true,
            category: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 50
    });

    return {
      safeDeals: safeDeals.map((safeDeal) => ({
        ...safeDeal,
        escrowProjection: {
          escrowStatusCached: safeDeal.escrowStatusCached,
          escrowLastSyncedAt: safeDeal.escrowLastSyncedAt,
          freshness: getSafeDealProjectionFreshness({
            lastSyncedAt: safeDeal.escrowLastSyncedAt
          })
        },
        disputeProjection: {
          disputeStatusCached: safeDeal.disputeStatusCached,
          disputeReasonCached: safeDeal.disputeReasonCached,
          disputeLastSyncedAt: safeDeal.disputeLastSyncedAt,
          freshness: getSafeDealProjectionFreshness({
            lastSyncedAt: safeDeal.disputeLastSyncedAt
          })
        }
      }))
    };
  });


  app.post("/safe-deals/:id/confirm", { preHandler: authenticate }, async (request, reply) => {
    const authUser = requireAuthUser(request);
    const params = z.object({ id: z.string().uuid() }).safeParse(request.params);

    if (!params.success) {
      return reply.code(400).send({ error: "Invalid Safe Deal ID." });
    }

    const safeDeal = await prisma.safeDeal.findFirst({
      where: {
        id: params.data.id,
        organizationId: getRequestedOrganizationId(request) ?? null
      }
    });

    if (!safeDeal) {
      return reply.code(404).send({ error: "Safe Deal not found." });
    }

    if (safeDeal.buyerId !== authUser.userId) {
      return reply.code(403).send({ error: "Only the buyer can confirm delivery." });
    }

    if (!safeDeal.trustLayerEscrowId) {
      return reply.code(409).send({ error: "Safe Deal is missing TrustLayer escrow reference." });
    }

    if (!["FUNDED", "DELIVERED"].includes(safeDeal.escrowStatusCached ?? "")) {
      return reply.code(400).send({ error: "Only funded or delivered Safe Deals can be confirmed." });
    }

    
    const escrowFreshness = requireFreshEscrowProjection(safeDeal.escrowLastSyncedAt);
    if (!escrowFreshness.ok) {
    void writeAuditLog({
      request,
      actorUserId: authUser.userId,
      action: "SAFE_DEAL_COMMAND_BLOCKED_STALE_ESCROW_PROJECTION",
      entityType: "SAFE_DEAL",
      entityId: safeDeal.id,
      metadata: {
        projection: "ESCROW",
        freshness: escrowFreshness.state,
        trustLayerEscrowId: safeDeal.trustLayerEscrowId
      }
    });

      return reply.code(409).send({
        error: escrowFreshness.error,
        projection: "ESCROW",
        freshness: escrowFreshness.state
      });
    }

    const trustLayer = getTrustLayerClient();

    const command = await trustLayer.confirmSafeDeal(
      safeDeal.trustLayerEscrowId,
      {
        correlationId: request.id,
        idempotencyKey: `safedeal_confirm_${safeDeal.id}_${authUser.userId}`
      }
    );

    await prisma.safeDeal.update({
      where: { id: safeDeal.id },
      data: {
        escrowStatusCached: command.status,
        escrowLastSyncedAt: new Date()
      }
    });

    void writeAuditLog({
      request,
      actorUserId: authUser.userId,
      action: "SAFE_DEAL_CONFIRM_COMMAND_SENT",
      entityType: "SAFE_DEAL",
      entityId: safeDeal.id,
      metadata: {
        trustLayerEscrowId: safeDeal.trustLayerEscrowId,
        trustLayerStatus: command.status
      }
    });

    return {
      safeDealId: safeDeal.id,
      trustLayer: command,
      sync: "PENDING_WEBHOOK"
    };
  });

  app.post("/safe-deals/:id/dispute", { preHandler: authenticate }, async (request, reply) => {
    const authUser = requireAuthUser(request);

    const params = z.object({
      id: z.string().uuid()
    }).safeParse(request.params);

    const body = z.object({
      reason: z.string().min(10).max(500)
    }).safeParse(request.body);

    if (!params.success || !body.success) {
      return reply.code(400).send({
        error: "Invalid dispute payload."
      });
    }

    const safeDeal = await prisma.safeDeal.findFirst({
      where: {
        id: params.data.id,
        organizationId: getRequestedOrganizationId(request) ?? null
      },
      include: {
        dispute: true
      }
    });

    if (!safeDeal) {
      return reply.code(404).send({
        error: "Safe Deal not found."
      });
    }

    if (
      ![safeDeal.buyerId, safeDeal.sellerId].includes(authUser.userId)
    ) {
      return reply.code(403).send({
        error: "Only deal participants can dispute this Safe Deal."
      });
    }

    if (!safeDeal.trustLayerEscrowId) {
      return reply.code(409).send({
        error: "Safe Deal is missing TrustLayer escrow reference."
      });
    }

    if (!["FUNDED", "DELIVERED"].includes(safeDeal.escrowStatusCached ?? "")) {
      return reply.code(400).send({
        error: "Only funded or delivered Safe Deals can be disputed."
      });
    }

    if (safeDeal.dispute) {
      return reply.code(409).send({
        error: "A dispute already exists for this Safe Deal."
      });
    }

    
    const escrowFreshness = requireFreshEscrowProjection(safeDeal.escrowLastSyncedAt);
    if (!escrowFreshness.ok) {
    void writeAuditLog({
      request,
      actorUserId: authUser.userId,
      action: "SAFE_DEAL_COMMAND_BLOCKED_STALE_ESCROW_PROJECTION",
      entityType: "SAFE_DEAL",
      entityId: safeDeal.id,
      metadata: {
        projection: "ESCROW",
        freshness: escrowFreshness.state,
        trustLayerEscrowId: safeDeal.trustLayerEscrowId
      }
    });

      return reply.code(409).send({
        error: escrowFreshness.error,
        projection: "ESCROW",
        freshness: escrowFreshness.state
      });
    }

    const trustLayer = getTrustLayerClient();

    const command = await trustLayer.openSafeDealDispute(
      safeDeal.trustLayerEscrowId,
      {
        correlationId: request.id,
        idempotencyKey: `safedeal_dispute_${safeDeal.id}_${authUser.userId}`
      }
    );

    const result = await prisma.$transaction(async (tx) => {
      const updatedSafeDeal = await tx.safeDeal.update({
        where: { id: safeDeal.id },
        data: {
          escrowStatusCached: command.status,
          escrowLastSyncedAt: new Date(),
        }
      });

      const dispute = await tx.dispute.create({
        data: {
          safeDealId: safeDeal.id,
          openedById: authUser.userId,
          reason: body.data.reason,
          status: "OPEN"
        }
      });

      await tx.disputeEvent.create({
        data: {
          disputeId: dispute.id,
          actorUserId: authUser.userId,
          eventType: "OPENED",
          note: body.data.reason,
          metadata: {
            trustLayerEscrowId: safeDeal.trustLayerEscrowId,
            trustLayerStatus: command.status
          }
        }
      });

      return {
        safeDeal: updatedSafeDeal,
        dispute
      };
    });

    void writeAuditLog({
      request,
      actorUserId: authUser.userId,
      action: "SAFE_DEAL_DISPUTE_OPENED",
      entityType: "DISPUTE",
      entityId: result.dispute.id,
      metadata: {
        safeDealId: safeDeal.id,
        trustLayerEscrowId: safeDeal.trustLayerEscrowId
      }
    });

    createRiskSignal({
      signalType: "DISPUTE_CLUSTER",
      severity: "MEDIUM",
      aggregateId: result.dispute.id,
      correlationId: request.id,
      source: "render.api",
      actorUserId: authUser.userId,
      metadata: {
        safeDealId: safeDeal.id,
        trustLayerEscrowId: safeDeal.trustLayerEscrowId,
        boundary: "NON_AUTHORITATIVE_RENDER_SIGNAL"
      }
    });

    return {
      safeDealId: safeDeal.id,
      disputeId: result.dispute.id,
      trustLayer: command,
      sync: "PENDING_WEBHOOK"
    };
  });

  app.get("/safe-deals/:id", { preHandler: authenticate }, async (request, reply) => {
    const authUser = requireAuthUser(request);
    const paramsSchema = z.object({
      id: z.string().uuid()
    });

    const parsed = paramsSchema.safeParse(request.params);

    if (!parsed.success) {
      return reply.code(400).send({
        error: "Invalid Safe Deal ID."
      });
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
        id: parsed.data.id,
        organizationId: requestedOrganizationId ?? null,
        OR: [
          { buyerId: authUser.userId },
          { sellerId: authUser.userId }
        ]
      },
      include: {
        listing: true,
        review: {
          select: {
            id: true,
            rating: true,
            body: true,
            createdAt: true
          }
        }
      }
    });

    if (!safeDeal) {
      return reply.code(404).send({
        error: "Safe Deal not found."
      });
    }

    return {
      safeDeal: {
        ...safeDeal,
        escrowProjection: {
          escrowStatusCached: safeDeal.escrowStatusCached,
          escrowLastSyncedAt: safeDeal.escrowLastSyncedAt,
          freshness: getSafeDealProjectionFreshness({
            lastSyncedAt: safeDeal.escrowLastSyncedAt
          })
        },
        disputeProjection: {
          disputeStatusCached: safeDeal.disputeStatusCached,
          disputeReasonCached: safeDeal.disputeReasonCached,
          disputeLastSyncedAt: safeDeal.disputeLastSyncedAt,
          freshness: getSafeDealProjectionFreshness({
            lastSyncedAt: safeDeal.disputeLastSyncedAt
          })
        }
      }
    };
  });
}
