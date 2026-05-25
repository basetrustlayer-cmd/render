import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const safeDealRoutes = readFileSync(resolve("src/safe-deals/routes.ts"), "utf8");
const freshnessSource = readFileSync(resolve("src/safe-deals/projection-freshness.ts"), "utf8");

describe("SafeDeal projection expiry enforcement contract", () => {
  it("exposes escrow and dispute projection freshness in SafeDeal read models", () => {
    expect(safeDealRoutes).toContain("escrowProjection");
    expect(safeDealRoutes).toContain("disputeProjection");
    expect(safeDealRoutes).toContain("getSafeDealProjectionFreshness");
  });

  it("classifies missing and stale projection sync state explicitly", () => {
    expect(freshnessSource).toContain('"MISSING"');
    expect(freshnessSource).toContain('"STALE"');
    expect(freshnessSource).toContain('"FRESH"');
  });

  it("does not make Render the source of truth for expired projections", () => {
    expect(safeDealRoutes).not.toContain("forceRefreshEscrowState");
    expect(safeDealRoutes).not.toContain("reconcileEscrowInternally");
    expect(safeDealRoutes).not.toContain("overrideTrustLayerProjection");
  });
});
