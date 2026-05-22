import { createRenderQueue, RENDER_QUEUE_NAMES } from "@render/queue";
import { createTrustLayerClient } from "@render/trustlayer-sdk";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../database/client.js";
import { authenticate, requireAuthUser } from "../auth/middleware.js";
import { writeAuditLog } from "../audit/log.js";
import { createSettlementLedgerForConfirmedDeal } from "../ledger/settlement.js";

const createSafeDealSchema = z.object({
  listingId: z.string().uuid()
});


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

    const listing = await prisma.listing.findFirst({
      where: {
        id: parsed.data.listingId,
        deletedAt: null
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
        amount,
        feeAmount: 0,
        status: "INITIATED",
        trustLayerEscrowId: intent.escrowId,
        checkoutUrl: intent.paymentUrl,
        escrowStatusCached: intent.status,
        escrowLastSyncedAt: new Date()
      }
    });

    void writeAuditLog({ request, actorUserId: authUser.userId, action: "SAFE_DEAL_INTENT_CREATED", entityType: "SAFE_DEAL", entityId: safeDeal.id, metadata: { listingId: listing.id, sellerId: listing.sellerId, trustLayerEscrowId: intent.escrowId } });

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

    const safeDeals = await prisma.safeDeal.findMany({
      where: {
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

    return { safeDeals };
  });


  app.post("/safe-deals/:id/confirm", { preHandler: authenticate }, async (request, reply) => {
    const authUser = requireAuthUser(request);
    const params = z.object({ id: z.string().uuid() }).safeParse(request.params);

    if (!params.success) {
      return reply.code(400).send({ error: "Invalid Safe Deal ID." });
    }

    const safeDeal = await prisma.safeDeal.findUnique({
      where: { id: params.data.id }
    });

    if (!safeDeal) {
      return reply.code(404).send({ error: "Safe Deal not found." });
    }

    if (safeDeal.buyerId !== authUser.userId) {
      return reply.code(403).send({ error: "Only the buyer can confirm delivery." });
    }

    if (!["FUNDED", "DELIVERED"].includes(safeDeal.status)) {
      return reply.code(400).send({ error: "Only funded or delivered Safe Deals can be confirmed." });
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.safeDeal.update({
        where: { id: safeDeal.id },
        data: {
          status: "CONFIRMED",
          confirmedAt: new Date()
        }
      });

      const settlement = await createSettlementLedgerForConfirmedDeal({
        tx,
        safeDeal: {
          id: updated.id,
          sellerId: updated.sellerId,
          amount: updated.amount,
          feeAmount: updated.feeAmount
        }
      });

      const ledgerEntries = await tx.escrowLedgerEntry.findMany({
        where: { safeDealId: updated.id },
        orderBy: { createdAt: "asc" }
      });

      return {
        safeDeal: updated,
        settlement,
        ledgerEntries
      };
    });

    const settlementQueue = createRenderQueue(RENDER_QUEUE_NAMES.settlementProcessing);

    const settlementJob = await settlementQueue.add("process-settlement", {
      safeDealId: result.safeDeal.id,
      settlementId: result.settlement.id,
      triggeredBy: "buyer_confirmation",
      triggeredAt: new Date().toISOString()
    });

    await settlementQueue.close();

    void writeAuditLog({
      request,
      actorUserId: authUser.userId,
      action: "SAFE_DEAL_CONFIRMED",
      entityType: "SAFE_DEAL",
      entityId: result.safeDeal.id,
      metadata: {
        settlementId: result.settlement.id,
        ledgerEntryCount: result.ledgerEntries.length,
        settlementJobId: settlementJob.id
      }
    });

    return {
      ...result,
      settlementJob: {
        id: settlementJob.id,
        queue: RENDER_QUEUE_NAMES.settlementProcessing
      }
    };
  });

  app.post("/safe-deals/:id/dispute", { preHandler: authenticate }, async (request, reply) => {
    const authUser = requireAuthUser(request);
    const params = z.object({ id: z.string().uuid() }).safeParse(request.params);

    if (!params.success) {
      return reply.code(400).send({ error: "Invalid Safe Deal ID." });
    }

    const safeDeal = await prisma.safeDeal.findUnique({
      where: { id: params.data.id }
    });

    if (!safeDeal) {
      return reply.code(404).send({ error: "Safe Deal not found." });
    }

    if (![safeDeal.buyerId, safeDeal.sellerId].includes(authUser.userId)) {
      return reply.code(403).send({ error: "Only deal participants can dispute this Safe Deal." });
    }

    if (!["FUNDED", "DELIVERED"].includes(safeDeal.status)) {
      return reply.code(400).send({ error: "Only funded or delivered Safe Deals can be disputed." });
    }

    const updated = await prisma.safeDeal.update({
      where: { id: safeDeal.id },
      data: {
        status: "DISPUTED"
      }
    });

    void writeAuditLog({ request, actorUserId: authUser.userId, action: "SAFE_DEAL_DISPUTED", entityType: "SAFE_DEAL", entityId: updated.id });

    return { safeDeal: updated };
  });

  app.get("/safe-deals/:id/ledger", { preHandler: authenticate }, async (request, reply) => {
    const authUser = requireAuthUser(request);
    const params = z.object({ id: z.string().uuid() }).safeParse(request.params);

    if (!params.success) {
      return reply.code(400).send({ error: "Invalid Safe Deal ID." });
    }

    const safeDeal = await prisma.safeDeal.findFirst({
      where: {
        id: params.data.id,
        OR: [
          { buyerId: authUser.userId },
          { sellerId: authUser.userId }
        ]
      },
      include: {
        ledgerEntries: {
          orderBy: { createdAt: "asc" }
        },
        settlement: true
      }
    });

    if (!safeDeal) {
      return reply.code(404).send({ error: "Safe Deal not found." });
    }

    return {
      safeDealId: safeDeal.id,
      status: safeDeal.status,
      settlement: safeDeal.settlement,
      ledgerEntries: safeDeal.ledgerEntries
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

    const safeDeal = await prisma.safeDeal.findFirst({
      where: {
        id: parsed.data.id,
        OR: [
          { buyerId: authUser.userId },
          { sellerId: authUser.userId }
        ]
      },
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
