import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("TrustLayer webhook projection sync hardening", () => {
  const webhookRoutes = readFileSync(resolve(process.cwd(), "src/webhooks/routes.ts"), "utf8");
  const safeDealsRoutes = readFileSync(resolve(process.cwd(), "src/safe-deals/routes.ts"), "utf8");

  it("keeps TrustLayer webhooks as the projection synchronization authority", () => {
    expect(webhookRoutes).toContain("provider");
    expect(webhookRoutes).toContain("eventId");
    expect(webhookRoutes).toContain("eventType");
    expect(webhookRoutes).toContain("processedAt");
    expect(webhookRoutes).toContain("provider_eventId");
  });

  it("requires idempotent webhook event persistence through create plus duplicate handling", () => {
    expect(webhookRoutes).toContain("webhookEvent.create");
    expect(webhookRoutes).toContain("isUniqueConstraintError");
    expect(webhookRoutes).toContain("WEBHOOK_TRUSTLAYER_DUPLICATE_IGNORED");
    expect(webhookRoutes).toContain("provider_eventId");
  });

  it("allows SafeDeal command routes to mark command sync pending, not final authority", () => {
    expect(safeDealsRoutes).toContain("sync: \"PENDING_WEBHOOK\"");
    expect(safeDealsRoutes).toContain("createSafeDealIntent");
    expect(safeDealsRoutes).toContain("confirmSafeDeal");
    expect(safeDealsRoutes).toContain("openSafeDealDispute");
  });

  it("prevents marketplace routes from directly assigning verification projection freshness", () => {
    expect(safeDealsRoutes).not.toContain("verificationLastSyncedAt: new Date()");
    expect(safeDealsRoutes).not.toContain("verificationProjectionExpiresAt: new Date(");
    expect(safeDealsRoutes).not.toContain("processedAt: new Date()");
  });

  it("records diagnostics for invalid TrustLayer syncedAt timestamps", () => {
    expect(webhookRoutes).toContain("parseTrustLayerSyncedAt");
    expect(webhookRoutes).toContain("WEBHOOK_TRUSTLAYER_INVALID_SYNCED_AT_FALLBACK_APPLIED");
    expect(webhookRoutes).toContain("INVALID_SYNCED_AT_FALLBACK");
  });

  it("records diagnostics when TrustLayer references a missing SafeDeal projection", () => {
    expect(webhookRoutes).toContain("WEBHOOK_TRUSTLAYER_MISSING_SAFE_DEAL_PROJECTION");
    expect(webhookRoutes).toContain('status: "MISSING_PROJECTION"');
  });
});
