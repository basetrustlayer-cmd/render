import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const adminRoutes = readFileSync(resolve(process.cwd(), "src/admin/routes.ts"), "utf8");

const actionIndex = adminRoutes.indexOf("ADMIN_DISPUTE_STATUS_UPDATED");
expect(actionIndex).toBeGreaterThanOrEqual(0);

const routeStart = adminRoutes.lastIndexOf("app.post(", actionIndex);
expect(routeStart).toBeGreaterThanOrEqual(0);

const routeEnd = adminRoutes.indexOf("return result;", actionIndex);
expect(routeEnd).toBeGreaterThan(routeStart);

const disputeStatusUpdateSection = adminRoutes.slice(routeStart, routeEnd);

describe("dispute admin resolution request contracts", () => {
  it("keeps Render admin dispute resolution as request/recommendation only", () => {
    expect(disputeStatusUpdateSection).toContain("ADMIN_DISPUTE_STATUS_UPDATED");
    expect(disputeStatusUpdateSection).toContain('boundary: "RENDER_PROJECTION_ONLY"');

    expect(disputeStatusUpdateSection).not.toContain("RESOLVED_BUYER_REFUND");
    expect(disputeStatusUpdateSection).not.toContain("RESOLVED_SELLER_RELEASE");
    expect(disputeStatusUpdateSection).not.toContain("releaseEscrow");
    expect(disputeStatusUpdateSection).not.toContain("refundBuyer");
    expect(disputeStatusUpdateSection).not.toContain("executeTransfer");
    expect(disputeStatusUpdateSection).not.toContain("prisma.settlement");
    expect(disputeStatusUpdateSection).not.toContain("escrowLedgerEntry");
  });

  it("does not expose admin dispute endpoints that directly execute financial resolution", () => {
    expect(adminRoutes).not.toContain('"/admin/disputes/:id/refund"');
    expect(adminRoutes).not.toContain('"/admin/disputes/:id/release"');
    expect(adminRoutes).not.toContain('"/admin/disputes/:id/settle"');
    expect(adminRoutes).not.toContain('"/admin/disputes/:id/payout"');
    expect(adminRoutes).not.toContain('"/admin/disputes/:id/transfer"');
  });
});
