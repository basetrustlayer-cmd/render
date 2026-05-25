import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const safeDealRoutes = readFileSync(resolve("src/safe-deals/routes.ts"), "utf8");

describe("SafeDeal stale projection read guard contract", () => {
  it("surfaces projection freshness metadata in SafeDeal responses", () => {
    expect(safeDealRoutes).toContain("escrowProjection");
    expect(safeDealRoutes).toContain("disputeProjection");
    expect(safeDealRoutes).toContain("getSafeDealProjectionFreshness");
  });

  it("does not silently trust stale escrow projections", () => {
    expect(safeDealRoutes).toContain("freshness");
    expect(safeDealRoutes).not.toContain("implicitlyTrustExpiredEscrowProjection");
    expect(safeDealRoutes).not.toContain("assumeProjectionFreshness");
  });

  it("does not allow SafeDeal reads to mutate TrustLayer state", () => {
    expect(safeDealRoutes).not.toContain("refreshEscrowState");
    expect(safeDealRoutes).not.toContain("syncEscrowDuringRead");
    expect(safeDealRoutes).not.toContain("repairProjectionOnRead");
  });
});
