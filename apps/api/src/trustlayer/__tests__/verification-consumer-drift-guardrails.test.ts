import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("verification consumer drift guardrails", () => {
  const authRoutes = readFileSync(resolve(process.cwd(), "src/auth/routes.ts"), "utf8");
  const listingRoutes = readFileSync(resolve(process.cwd(), "src/listings/routes.ts"), "utf8");
  const messagingRoutes = readFileSync(resolve(process.cwd(), "src/messaging/routes.ts"), "utf8");
  const adminRoutes = readFileSync(resolve(process.cwd(), "src/admin/routes.ts"), "utf8");
  const trustScoreRoutes = readFileSync(resolve(process.cwd(), "src/trustscore/routes.ts"), "utf8");
  const webhookRoutes = readFileSync(resolve(process.cwd(), "src/webhooks/routes.ts"), "utf8");

  it("keeps TrustLayer webhook ingestion as the only writer of verification projection freshness", () => {
    const consumers = [authRoutes, listingRoutes, messagingRoutes, adminRoutes, trustScoreRoutes];

    for (const source of consumers) {
      expect(source).not.toContain("verificationLastSyncedAt: new Date()");
      expect(source).not.toContain("verificationProjectionExpiresAt: new Date(");
      expect(source).not.toContain("verificationStatusCached: normalizeVerificationStatus");
    }

    expect(webhookRoutes).toContain("verificationLastSyncedAt: new Date()");
    expect(webhookRoutes).toContain("verificationProjectionExpiresAt: new Date(");
    expect(webhookRoutes).toContain("verificationStatusCached: normalizeVerificationStatus(verificationStatus)");
  });

  it("prevents auth and marketplace writes from self-assigning TrustLayer authority fields", () => {
    const writeSurfaces = [authRoutes, listingRoutes, messagingRoutes];

    for (const source of writeSurfaces) {
      expect(source).not.toContain("verificationLevel: parsed.data");
      expect(source).not.toContain("verificationStatusCached: parsed.data");
      expect(source).not.toContain("trustScore: parsed.data");
      expect(source).not.toContain("trustTier: parsed.data");
      expect(source).not.toContain("trustBadgeCached: parsed.data");
    }
  });

  it("allows consumer routes to read cached projection fields but not mutate their freshness", () => {
    expect(listingRoutes).toContain("verificationStatusCached: true");
    expect(listingRoutes).toContain("trustScore: true");
    expect(listingRoutes).toContain("trustTier: true");

    expect(adminRoutes).toContain("verificationLevel: true");
    expect(adminRoutes).toContain("trustScore: true");
    expect(adminRoutes).toContain("trustTier: true");
  });
});
