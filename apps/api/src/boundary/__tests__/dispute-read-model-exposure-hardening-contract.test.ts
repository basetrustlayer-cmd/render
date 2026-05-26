import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const adminRoutes = readFileSync(resolve(process.cwd(), "src/admin/routes.ts"), "utf8");
const safeDealRoutes = readFileSync(resolve(process.cwd(), "src/safe-deals/routes.ts"), "utf8");
const schema = readFileSync(resolve(process.cwd(), "prisma/schema.prisma"), "utf8");

const disputeModel = schema.slice(
  schema.indexOf("model Dispute {"),
  schema.indexOf("model DisputeEvent {")
);

describe("dispute read-model exposure hardening contract", () => {
  it("keeps TrustLayer dispute projection fields on the Dispute read model", () => {
    expect(disputeModel).toContain("trustLayerDisputeId");
    expect(disputeModel).toContain("disputeStatusCached");
    expect(disputeModel).toContain("disputeReasonCached");
    expect(disputeModel).toContain("disputeLastSyncedAt");
  });

  it("keeps admin dispute routes read-oriented and projection-only", () => {
    expect(adminRoutes).toContain('app.get("/admin/disputes"');
    expect(adminRoutes).toContain('app.get("/admin/disputes/:id"');
    expect(adminRoutes).toContain("prisma.dispute.findMany");
    expect(adminRoutes).toContain("prisma.dispute.findFirst");

    expect(adminRoutes).not.toContain('"/admin/disputes/:id/refund"');
    expect(adminRoutes).not.toContain('"/admin/disputes/:id/release"');
    expect(adminRoutes).not.toContain('"/admin/disputes/:id/settle"');
    expect(adminRoutes).not.toContain('"/admin/disputes/:id/payout"');
    expect(adminRoutes).not.toContain("RESOLVED_BUYER_REFUND");
    expect(adminRoutes).not.toContain("RESOLVED_SELLER_RELEASE");
  });

  it("keeps SafeDeal customer read models exposing dispute projection summaries", () => {
    expect(safeDealRoutes).toContain("disputeProjection");
    expect(safeDealRoutes).toContain("disputeStatusCached");
    expect(safeDealRoutes).toContain("disputeReasonCached");
    expect(safeDealRoutes).toContain("disputeLastSyncedAt");
    expect(safeDealRoutes).toContain("getSafeDealProjectionFreshness");
  });
});
