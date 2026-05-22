import crypto from "node:crypto";
import { createRenderQueue, RENDER_QUEUE_NAMES } from "@render/queue";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../database/client.js";
import { authenticate, requireAuthUser } from "../auth/middleware.js";
import { apiEnv } from "../env.js";
import { writeAuditLog } from "../audit/log.js";
import { createSettlementLedgerForConfirmedDeal } from "../ledger/settlement.js";

const createSafeDealSchema = z.object({
  listingId: z.string().uuid()
});

async function initializePaystackTransaction(input: {
  amountGhs: number;
  buyerEmail: string;
  reference: string;
  safeDealId: string;
  listingId: string;
}) {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;

  if (!secretKey) {
    throw new Error("PAYSTACK_SECRET_KEY is required.");
  }

  const callbackUrl = `${apiEnv.publicAppUrl}/safe-deal/${input.safeDealId}`;

  const response = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email: input.buyerEmail,
      amount: Math.round(input.amountGhs * 100),
      currency: "GHS",
      reference: input.reference,
      callback_url: callbackUrl,
      metadata: {
        safeDealId: input.safeDealId,
        listingId: input.listingId
      }
    })
  });

  const data = await response.json() as {
    status: boolean;
    message?: string;
    data?: {
      authorization_url?: string;
      access_code?: string;
      reference?: string;
    };
  };

  if (!response.ok || !data.status || !data.data?.authorization_url) {
    throw new Error(data.message ?? "Unable to initialize Paystack transaction.");
  }

  return data.data;
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
        email: true,
        phone: true
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

    const amount = listing.price;
    const amountNumber = Number(amount);
    const feeAmount = amountNumber * 0.015;

    if (amountNumber < 200) {
      return reply.code(400).send({
        error: "Safe Deal minimum amount is GHS 200."
      });
    }

    if (!buyer?.email && !buyer?.phone) {
      return reply.code(400).send({
        error: "Buyer must have an email or phone number before funding a Safe Deal."
      });
    }

    const reference = `render-${crypto.randomUUID().replace(/-/g, "")}`;

    const safeDeal = await prisma.safeDeal.create({
      data: {
        listingId: listing.id,
        buyerId: authUser.userId,
        sellerId: listing.sellerId,
        amount,
        feeAmount,
        paystackReference: reference,
        status: "INITIATED"
      }
    });

    const checkout = await initializePaystackTransaction({
      amountGhs: amountNumber,
      buyerEmail: buyer.email ?? `${buyer.phone}@render.com.gh`,
      reference,
      safeDealId: safeDeal.id,
      listingId: listing.id
    });

    void writeAuditLog({ request, actorUserId: authUser.userId, action: "SAFE_DEAL_INITIATED", entityType: "SAFE_DEAL", entityId: safeDeal.id, metadata: { listingId: listing.id, sellerId: listing.sellerId } });

    return reply.code(201).send({
      safeDeal,
      checkout: {
        provider: "PAYSTACK",
        authorizationUrl: checkout.authorization_url,
        reference: checkout.reference ?? reference
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
      where: { id: params.data.id },
      include: {
        seller: {
          select: {
            payoutReady: true,
            paystackRecipientCode: true
          }
        }
      }
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

    if (!safeDeal.seller.payoutReady || !safeDeal.seller.paystackRecipientCode) {
      return reply.code(409).send({
        error: "Seller payout setup is incomplete. Safe Deal cannot be confirmed for payout yet."
      });
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
