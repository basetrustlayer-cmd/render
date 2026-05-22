import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import {
  assertSettlementLedgerInvariant,
  calculateSellerReceivable
} from "../settlement.js";

describe("settlement ledger helpers", () => {
  it("calculates seller receivable as amount minus platform fee", () => {
    const result = calculateSellerReceivable({
      amount: new Prisma.Decimal("100.00"),
      feeAmount: new Prisma.Decimal("7.50")
    });

    expect(result.toString()).toBe("92.5");
  });

  it("accepts balanced buyer hold, fee, and seller payable amounts", () => {
    expect(() =>
      assertSettlementLedgerInvariant({
        safeDealId: "safe-deal-test",
        buyerHoldAmount: new Prisma.Decimal("100.00"),
        platformFeeAmount: new Prisma.Decimal("7.50"),
        sellerPayableAmount: new Prisma.Decimal("92.50")
      })
    ).not.toThrow();
  });

  it("rejects unbalanced ledger amounts", () => {
    expect(() =>
      assertSettlementLedgerInvariant({
        safeDealId: "safe-deal-test",
        buyerHoldAmount: new Prisma.Decimal("100.00"),
        platformFeeAmount: new Prisma.Decimal("7.50"),
        sellerPayableAmount: new Prisma.Decimal("91.50")
      })
    ).toThrow("Ledger invariant failed");
  });
});
