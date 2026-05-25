import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const adminRoutes = readFileSync(resolve(process.cwd(), "src/admin/routes.ts"), "utf8");

const disputeStatusSchemaSection = adminRoutes.slice(
  adminRoutes.indexOf("const disputeStatusSchema"),
  adminRoutes.indexOf("const deadLetterListQuerySchema")
);

const disputeStatusUpdateSection = adminRoutes.slice(
  adminRoutes.indexOf('app.post("/admin/disputes/:id/status"'),
  adminRoutes.lastIndexOf("});")
);

describe("dispute state machine guardrails", () => {
  it("keeps Render dispute status updates workflow-only without financial execution", () => {
    expect(disputeStatusUpdateSection).toContain("ADMIN_DISPUTE_STATUS_UPDATED");
    expect(disputeStatusUpdateSection).toContain('boundary: "RENDER_PROJECTION_ONLY"');

    expect(disputeStatusUpdateSection).not.toContain("RESOLVED_BUYER_REFUND");
    expect(disputeStatusUpdateSection).not.toContain("RESOLVED_SELLER_RELEASE");
    expect(disputeStatusUpdateSection).not.toContain("prisma.settlement");
    expect(disputeStatusUpdateSection).not.toContain("escrowLedgerEntry");
    expect(disputeStatusUpdateSection).not.toContain("releaseEscrow");
    expect(disputeStatusUpdateSection).not.toContain("refundBuyer");
    expect(disputeStatusUpdateSection).not.toContain("transfer");
    expect(disputeStatusUpdateSection).not.toContain("payout");
  });

  it("allows only active moderator workflow statuses from Render admin status updates", () => {
    expect(disputeStatusSchemaSection).toContain('"UNDER_REVIEW"');
    expect(disputeStatusSchemaSection).toContain('"NEEDS_BUYER_RESPONSE"');
    expect(disputeStatusSchemaSection).toContain('"NEEDS_SELLER_RESPONSE"');

    expect(disputeStatusSchemaSection).not.toContain("RESOLVED_BUYER_REFUND");
    expect(disputeStatusSchemaSection).not.toContain("RESOLVED_SELLER_RELEASE");
    expect(disputeStatusSchemaSection).not.toContain("CANCELLED");
  });
});
