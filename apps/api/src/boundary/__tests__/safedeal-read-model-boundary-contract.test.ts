import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("SafeDeal read model boundary contract", () => {
  const safeDealRoutes = fs.readFileSync(
    path.resolve("src/safe-deals/routes.ts"),
    "utf8",
  );

  it("uses TrustLayer projection cache fields for read models", () => {
    expect(safeDealRoutes).toContain("escrowStatusCached");
    expect(safeDealRoutes).toContain("escrowAmountCached");
    expect(safeDealRoutes).toContain("escrowFeeCached");
  });

  it("does not expose Render-owned escrow lifecycle state", () => {
    expect(safeDealRoutes).not.toContain("mappedStatus");
    expect(safeDealRoutes).not.toContain("internalEscrowState");
    expect(safeDealRoutes).not.toContain("releaseFunds");
    expect(safeDealRoutes).not.toContain("captureFunds");
  });

  it("does not perform settlement authority operations", () => {
    expect(safeDealRoutes).not.toContain("ledgerEntry");
    expect(safeDealRoutes).not.toContain("walletBalance");
    expect(safeDealRoutes).not.toContain("payoutStatus");
    expect(safeDealRoutes).not.toContain("transferReference");
  });
});
