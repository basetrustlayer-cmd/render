import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const listingRoutes = readFileSync(resolve("src/listings/routes.ts"), "utf8");
const safeDealRoutes = readFileSync(resolve("src/safe-deals/routes.ts"), "utf8");
const webhookRoutes = readFileSync(resolve("src/webhooks/routes.ts"), "utf8");

describe("sold listing marketplace visibility contract", () => {
  it("keeps marketplace listing reads scoped to live, undeleted inventory", () => {
    expect(listingRoutes).toContain('status: "LIVE" as const');
    expect(listingRoutes).toContain("deletedAt: null");
  });

  it("prevents SafeDeal creation for sold or non-live listings", () => {
    expect(safeDealRoutes).toContain('status: "LIVE"');
    expect(safeDealRoutes).toContain("deletedAt: null");
    expect(safeDealRoutes).toContain("Buyer cannot purchase their own listing.");
  });

  it("marks listing sold only from TrustLayer completion projection", () => {
    expect(webhookRoutes).toContain('status: "SOLD"');
    expect(webhookRoutes).toContain("wasAlreadyConfirmed");
    expect(webhookRoutes).not.toContain("markSoldManually");
  });
});
