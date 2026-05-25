import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const authRoutes = readFileSync(resolve(process.cwd(), "src/auth/routes.ts"), "utf8");
const listingRoutes = readFileSync(resolve(process.cwd(), "src/listings/routes.ts"), "utf8");
const adminRoutes = readFileSync(resolve(process.cwd(), "src/admin/routes.ts"), "utf8");
const webhookRoutes = readFileSync(resolve(process.cwd(), "src/webhooks/routes.ts"), "utf8");
const trustScoreRoutes = readFileSync(resolve(process.cwd(), "src/trustscore/routes.ts"), "utf8");

describe("TrustLayer projection consistency guardrails", () => {
  it("keeps webhooks as the only direct writer of projected trust fields", () => {
    const nonWebhookSources = [authRoutes, listingRoutes, adminRoutes, trustScoreRoutes];

    for (const source of nonWebhookSources) {
      expect(source).not.toContain("verificationLevel: parsed.data");
      expect(source).not.toContain("trustScore: parsed.data");
      expect(source).not.toContain("trustTier: parsed.data");
      expect(source).not.toContain("trustLastSyncedAt: new Date");
      expect(source).not.toContain("trustBadgeCached: parsed.data");
      expect(source).not.toContain("verificationStatusCached: parsed.data");
    }

    expect(webhookRoutes).toContain("verificationLevel");
    expect(webhookRoutes).toContain("trustScore");
    expect(webhookRoutes).toContain("trustTier");
    expect(webhookRoutes).toContain("trustLastSyncedAt");
  });

  it("requires trust projection consumers to expose freshness fields", () => {
    expect(listingRoutes).toContain("trustLastSyncedAt");
    expect(listingRoutes).toContain("verificationStatusCached");
    expect(listingRoutes).toContain("trustBadgeCached");

    expect(authRoutes).toContain("updatedAt: true");
    expect(adminRoutes).toContain("trustScore: true");
  });

  it("prevents public listing and seller pages from omitting sync freshness data forever", () => {
    const getListing = readFileSync(resolve(process.cwd(), "../../apps/web/lib/get-listing.ts"), "utf8");
    const getSeller = readFileSync(resolve(process.cwd(), "../../apps/web/lib/get-seller.ts"), "utf8");

    expect(getListing).toContain("trustLastSyncedAt");
    expect(getSeller).toContain("trustLastSyncedAt");
  });
});
