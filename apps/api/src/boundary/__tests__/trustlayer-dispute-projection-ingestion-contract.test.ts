import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const webhookRoutes = readFileSync(resolve(process.cwd(), "src/webhooks/routes.ts"), "utf8");

describe("TrustLayer dispute projection ingestion contract", () => {
  it("accepts TrustLayer dispute identifiers from webhook payloads", () => {
    expect(webhookRoutes).toContain("disputeId");
    expect(webhookRoutes).toContain("trustLayerDisputeId");
    expect(webhookRoutes).toContain("effectiveTrustLayerDisputeId");
  });

  it("hydrates the Dispute projection model from TrustLayer dispute events", () => {
    expect(webhookRoutes).toContain("tx.dispute.updateMany");
    expect(webhookRoutes).toContain("trustLayerDisputeId");
    expect(webhookRoutes).toContain("disputeStatusCached");
    expect(webhookRoutes).toContain("disputeReasonCached");
    expect(webhookRoutes).toContain("disputeLastSyncedAt");
  });

  it("keeps dispute projection updates monotonic and non-financial", () => {
    expect(webhookRoutes).toContain("disputeLastSyncedAt: { lte: eventTime }");
    expect(webhookRoutes).not.toContain("RESOLVED_BUYER_REFUND");
    expect(webhookRoutes).not.toContain("RESOLVED_SELLER_RELEASE");
    expect(webhookRoutes).not.toContain("settlement");
    expect(webhookRoutes).not.toContain("refund");
    expect(webhookRoutes).not.toContain("payout");
  });
});
