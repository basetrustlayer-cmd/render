import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const webhookRoutes = readFileSync(
  resolve("src/webhooks/routes.ts"),
  "utf8",
);

const safeDealRoutes = readFileSync(
  resolve("src/safe-deals/routes.ts"),
  "utf8",
);

describe("Dispute projection cache alignment contract", () => {
  it("updates dispute projection cache fields from TrustLayer webhooks only", () => {
    expect(webhookRoutes).toContain("disputeStatusCached");
    expect(webhookRoutes).toContain("disputeLastSyncedAt");
    expect(webhookRoutes).toContain("disputeReasonCached");
  });

  it("does not introduce Render-owned dispute orchestration state", () => {
    expect(webhookRoutes).not.toContain("internalDisputeState");
    expect(webhookRoutes).not.toContain("manualResolutionState");
    expect(webhookRoutes).not.toContain("resolveDisputeInternally");
  });

  it("exposes only projection cache dispute fields through SafeDeal APIs", () => {
    expect(safeDealRoutes).toContain("disputeStatusCached");
    expect(safeDealRoutes).toContain("disputeReasonCached");
    expect(safeDealRoutes).toContain("disputeProjection");
    expect(safeDealRoutes).toContain("safeDeals.map");

    expect(safeDealRoutes).not.toContain("assignedMediator");
    expect(safeDealRoutes).not.toContain("resolutionWorkflow");
    expect(safeDealRoutes).not.toContain("internalEscalationQueue");
  });
});
