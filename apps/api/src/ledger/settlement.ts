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

export function assertSettlementLedgerInvariant(input: {
  safeDealId: string;
  buyerHoldAmount: Prisma.Decimal;
  platformFeeAmount: Prisma.Decimal;
  sellerPayableAmount: Prisma.Decimal;
}): void {
  const expected = input.platformFeeAmount.plus(input.sellerPayableAmount);

  if (!input.buyerHoldAmount.equals(expected)) {
    throw new Error(
      `Ledger invariant failed for SafeDeal ${input.safeDealId}: BUYER_HOLD must equal PLATFORM_FEE + SELLER_PAYABLE.`
    );
  }
}

export function assertSettlementReleaseInvariant(input: {
  safeDealId: string;
  sellerPayableAmount: Prisma.Decimal;
  settlementReleaseAmount: Prisma.Decimal;
}): void {
  if (!input.sellerPayableAmount.equals(input.settlementReleaseAmount)) {
    throw new Error(
      `Ledger invariant failed for SafeDeal ${input.safeDealId}: SETTLEMENT_RELEASE must equal SELLER_PAYABLE.`
    );
  }
}

export async function createSettlementLedgerForConfirmedDeal(input: {
  tx: TransactionClient;
  safeDeal: {
    id: string;
    sellerId: string;
    organizationId?: string | null;
    amount: Prisma.Decimal;
    feeAmount: Prisma.Decimal;
  };
}) {
  const sellerReceivableAmount = calculateSellerReceivable({
    amount: input.safeDeal.amount,
    feeAmount: input.safeDeal.feeAmount
  });

  assertSettlementLedgerInvariant({
    safeDealId: input.safeDeal.id,
    buyerHoldAmount: input.safeDeal.amount,
    platformFeeAmount: input.safeDeal.feeAmount,
    sellerPayableAmount: sellerReceivableAmount
  });

  const settlement = await input.tx.settlement.upsert({
    where: { safeDealId: input.safeDeal.id },
    update: {
      status: "READY",
      grossAmount: input.safeDeal.amount,
      platformFeeAmount: input.safeDeal.feeAmount,
      sellerReceivableAmount,
      organizationId: input.safeDeal.organizationId ?? null,
      readyAt: new Date()
    },
    create: {
      safeDealId: input.safeDeal.id,
      sellerId: input.safeDeal.sellerId,
      organizationId: input.safeDeal.organizationId ?? null,
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

  assertSettlementReleaseInvariant({
    safeDealId: input.safeDealId,
    sellerPayableAmount: settlement.sellerReceivableAmount,
    settlementReleaseAmount: settlement.sellerReceivableAmount
  });

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
