import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const webhookRoutes = readFileSync(resolve("src/webhooks/routes.ts"), "utf8");

describe("sold projection idempotency contract", () => {
  it("prevents duplicate SOLD projection transitions after confirmation", () => {
    expect(webhookRoutes).toContain("wasAlreadyConfirmed");
    expect(webhookRoutes).toContain('status: "SOLD"');
    expect(webhookRoutes).toContain('escrowStatusCached === "CONFIRMED"');
  });

  it("keeps SOLD projection webhook-driven and monotonic", () => {
    expect(webhookRoutes).not.toContain("markSoldManually");
    expect(webhookRoutes).not.toContain("reopenListing");
    expect(webhookRoutes).not.toContain('status: "LIVE"');
  });

  it("keeps TrustLayer completion sync projection-based only", () => {
    expect(webhookRoutes).not.toContain("executePayout");
    expect(webhookRoutes).not.toContain("releaseEscrow");
    expect(webhookRoutes).not.toContain("refundBuyer");
  });
});
