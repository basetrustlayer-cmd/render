import { Prisma, type PrismaClient } from "@prisma/client";

type TransactionClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

export function calculateSellerReceivable(input: {
  amount: Prisma.Decimal;
  feeAmount: Prisma.Decimal;
}): Prisma.Decimal {
  return input.amount.minus(input.feeAmount);
}

export async function createSettlementLedgerForConfirmedDeal(input: {
  tx: TransactionClient;
  safeDeal: {
    id: string;
    sellerId: string;
    amount: Prisma.Decimal;
    feeAmount: Prisma.Decimal;
  };
}) {
  const sellerReceivableAmount = calculateSellerReceivable({
    amount: input.safeDeal.amount,
    feeAmount: input.safeDeal.feeAmount
  });

  const settlement = await input.tx.settlement.upsert({
    where: { safeDealId: input.safeDeal.id },
    update: {
      status: "READY",
      grossAmount: input.safeDeal.amount,
      platformFeeAmount: input.safeDeal.feeAmount,
      sellerReceivableAmount,
      readyAt: new Date()
    },
    create: {
      safeDealId: input.safeDeal.id,
      sellerId: input.safeDeal.sellerId,
      grossAmount: input.safeDeal.amount,
      platformFeeAmount: input.safeDeal.feeAmount,
      sellerReceivableAmount,
      status: "READY",
      readyAt: new Date()
    }
  });

  await input.tx.escrowLedgerEntry.createMany({
    data: [
      {
        safeDealId: input.safeDeal.id,
        entryType: "BUYER_HOLD",
        amount: input.safeDeal.amount,
        idempotencyKey: `${input.safeDeal.id}:buyer_hold`
      },
      {
        safeDealId: input.safeDeal.id,
        entryType: "PLATFORM_FEE",
        amount: input.safeDeal.feeAmount,
        idempotencyKey: `${input.safeDeal.id}:platform_fee`
      },
      {
        safeDealId: input.safeDeal.id,
        entryType: "SELLER_PAYABLE",
        amount: sellerReceivableAmount,
        idempotencyKey: `${input.safeDeal.id}:seller_payable`
      }
    ],
    skipDuplicates: true
  });

  return settlement;
}

export async function finalizeSettlementReleaseFromTrustLayer(input: {
  tx: TransactionClient;
  safeDealId: string;
  provider?: string;
  providerReference?: string;
  releasedAt: Date;
}) {
  const settlement = await input.tx.settlement.findUnique({
    where: { safeDealId: input.safeDealId }
  });

  if (!settlement) {
    return null;
  }

  const paidSettlement = await input.tx.settlement.update({
    where: { id: settlement.id },
    data: {
      status: "PAID",
      provider: input.provider ?? "TRUSTLAYER",
      providerReference: input.providerReference,
      paidAt: input.releasedAt
    }
  });

  await input.tx.escrowLedgerEntry.createMany({
    data: [
      {
        safeDealId: input.safeDealId,
        entryType: "SETTLEMENT_RELEASE",
        amount: settlement.sellerReceivableAmount,
        idempotencyKey: `${input.safeDealId}:settlement_release:${input.providerReference ?? "trustlayer"}`
      }
    ],
    skipDuplicates: true
  });

  return paidSettlement;
}
