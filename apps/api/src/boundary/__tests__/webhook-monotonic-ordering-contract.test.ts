import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const webhookRoutes = readFileSync(
  resolve("src/webhooks/routes.ts"),
  "utf8",
);

describe("Webhook monotonic ordering contract", () => {
  it("rejects stale escrow projection updates", () => {
    expect(webhookRoutes).toContain(
      "WEBHOOK_TRUSTLAYER_STALE_ESCROW_EVENT_IGNORED",
    );

    expect(webhookRoutes).toContain(
      "existing.escrowLastSyncedAt > eventTime",
    );
  });

  it("updates dispute projections only through normalized monotonic sync", () => {
    expect(webhookRoutes).toContain("normalizeTrustLayerDisputeStatus");
    expect(webhookRoutes).toContain("disputeLastSyncedAt");
  });

  it("does not introduce local webhook sequence authorities", () => {
    expect(webhookRoutes).not.toContain("localSequenceCounter");
    expect(webhookRoutes).not.toContain("internalEventVersion");
    expect(webhookRoutes).not.toContain("manuallyIncrementedVersion");
  });
});
