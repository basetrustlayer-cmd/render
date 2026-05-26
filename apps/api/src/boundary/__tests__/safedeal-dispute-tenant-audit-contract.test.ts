import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const safeDealRoutes = readFileSync(resolve(process.cwd(), "src/safe-deals/routes.ts"), "utf8");

const disputeRoute = safeDealRoutes.slice(
  safeDealRoutes.indexOf('app.post("/safe-deals/:id/dispute"'),
  safeDealRoutes.indexOf('app.get("/safe-deals/:id"')
);

describe("Safe Deal dispute tenant and audit contract", () => {
  it("persists the dispute organization context from the Safe Deal", () => {
    expect(disputeRoute).toContain("organizationId: safeDeal.organizationId");
  });

  it("creates a dispute opened event for moderator audit history", () => {
    expect(disputeRoute).toContain("tx.disputeEvent.create");
    expect(disputeRoute).toContain('eventType: "OPENED"');
    expect(disputeRoute).toContain("trustLayerEscrowId");
    expect(disputeRoute).toContain("trustLayerStatus");
  });

  it("keeps dispute opening as TrustLayer command plus Render projection only", () => {
    expect(disputeRoute).toContain("openSafeDealDispute");
    expect(disputeRoute).toContain('sync: "PENDING_WEBHOOK"');
    expect(disputeRoute).not.toContain("releaseEscrow");
    expect(disputeRoute).not.toContain("refundBuyer");
    expect(disputeRoute).not.toContain("executeTransfer");
  });
});
