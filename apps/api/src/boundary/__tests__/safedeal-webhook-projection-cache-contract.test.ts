import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const webhookRoutes = readFileSync(resolve(process.cwd(), "src/webhooks/routes.ts"), "utf8");

describe("SafeDeal webhook projection cache contract", () => {
  it("updates only TrustLayer SafeDeal projection cache fields from webhooks", () => {
    expect(webhookRoutes).toContain("mapTrustLayerEscrowStatus");
    expect(webhookRoutes).toContain("trustLayerEscrowId: escrowId");
    expect(webhookRoutes).toContain("escrowStatusCached: mappedStatus");
    expect(webhookRoutes).toContain("escrowLastSyncedAt: eventTime");

    expect(webhookRoutes).not.toContain("status: mappedStatus");
    expect(webhookRoutes).not.toContain("fundedAt:");
    expect(webhookRoutes).not.toContain("deliveredAt:");
    expect(webhookRoutes).not.toContain("confirmedAt:");
    expect(webhookRoutes).not.toContain("inspectionDeadline:");
  });

  it("does not reintroduce Render-owned SafeDeal lifecycle state", () => {
    expect(webhookRoutes).not.toContain("SafeDealStatus");
    expect(webhookRoutes).not.toContain("existing.status");
    expect(webhookRoutes).not.toContain("safeDeal.status");
  });
});
