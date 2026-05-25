import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const safeDealRoutes = readFileSync(resolve("src/safe-deals/routes.ts"), "utf8");

describe("SafeDeal command freshness guard contract", () => {
  it("blocks confirm and dispute commands when escrow projection is not fresh", () => {
    expect(safeDealRoutes).toContain("requireFreshEscrowProjection");
    expect(safeDealRoutes).toContain('freshness.state !== "FRESH"');
    expect(safeDealRoutes).toContain('projection: "ESCROW"');
  });

  it("checks projection freshness before sending TrustLayer commands", () => {
    expect(safeDealRoutes.indexOf("requireFreshEscrowProjection(safeDeal.escrowLastSyncedAt)")).toBeLessThan(
      safeDealRoutes.indexOf("confirmSafeDeal")
    );
    expect(safeDealRoutes.lastIndexOf("requireFreshEscrowProjection(safeDeal.escrowLastSyncedAt)")).toBeLessThan(
      safeDealRoutes.indexOf("openSafeDealDispute")
    );
  });

  it("does not mutate or repair TrustLayer projection during command guard", () => {
    expect(safeDealRoutes).not.toContain("refreshEscrowState");
    expect(safeDealRoutes).not.toContain("repairProjectionBeforeCommand");
    expect(safeDealRoutes).not.toContain("forceRefreshEscrowState");
  });
});
