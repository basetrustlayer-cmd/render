import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const adminRoutes = readFileSync(resolve(process.cwd(), "src/admin/routes.ts"), "utf8");

describe("admin dispute projection filter contract", () => {
  it("supports admin filtering by TrustLayer dispute projection fields", () => {
    expect(adminRoutes).toContain("disputeProjectionStatus");
    expect(adminRoutes).toContain("disputeProjectionFreshness");
    expect(adminRoutes).toContain("disputeStatusCached");
    expect(adminRoutes).toContain("disputeLastSyncedAt");
  });

  it("keeps dispute filtering read-model only", () => {
    expect(adminRoutes).toContain("prisma.dispute.findMany");
    expect(adminRoutes).not.toContain("RESOLVED_BUYER_REFUND");
    expect(adminRoutes).not.toContain("RESOLVED_SELLER_RELEASE");
    expect(adminRoutes).not.toContain('"/admin/disputes/:id/refund"');
    expect(adminRoutes).not.toContain('"/admin/disputes/:id/release"');
  });
});
