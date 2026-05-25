import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const webhookRoutes = readFileSync(resolve("src/webhooks/routes.ts"), "utf8");

describe("webhook event classification boundary contract", () => {
  it("classifies TrustLayer events into explicit bounded projections", () => {
    expect(webhookRoutes).toContain('function classifyTrustLayerEvent(event: string): "USER" | "SAFE_DEAL" | "UNKNOWN"');
    expect(webhookRoutes).toContain('return "USER"');
    expect(webhookRoutes).toContain('return "SAFE_DEAL"');
    expect(webhookRoutes).toContain('return "UNKNOWN"');
  });

  it("keeps escrow events isolated from user trust projections", () => {
    expect(webhookRoutes).toContain("isTrustLayerUserEvent");
    expect(webhookRoutes).toContain("isTrustLayerEscrowEvent");

    expect(webhookRoutes).not.toContain("syncUserEscrowBalance");
    expect(webhookRoutes).not.toContain("updateWalletBalance");
    expect(webhookRoutes).not.toContain("mutateFinancialLedger");
  });

  it("treats unknown webhook events as ignored operational events", () => {
    expect(webhookRoutes).toContain("WEBHOOK_TRUSTLAYER_UNKNOWN_EVENT_IGNORED");
    expect(webhookRoutes).toContain('status: "UNKNOWN_IGNORED"');

    expect(webhookRoutes).not.toContain("autoCreateProjection");
    expect(webhookRoutes).not.toContain("inferUnknownEventSchema");
  });
});
