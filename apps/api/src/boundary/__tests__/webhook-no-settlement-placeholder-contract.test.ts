import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const webhookRoutes = readFileSync(resolve("src/webhooks/routes.ts"), "utf8");

describe("webhook no settlement placeholder contract", () => {
  it("does not expose settlement placeholder fields from TrustLayer webhook sync", () => {
    expect(webhookRoutes).not.toContain("settlementId");
    expect(webhookRoutes).not.toContain("settlementId: null");
    expect(webhookRoutes).not.toContain("prisma.settlement");
  });

  it("keeps webhook sync response projection-only", () => {
    expect(webhookRoutes).toContain("updatedEscrows");
    expect(webhookRoutes).toContain("organizationId");
    expect(webhookRoutes).toContain("WEBHOOK_TRUSTLAYER_RECEIVED");
  });
});
