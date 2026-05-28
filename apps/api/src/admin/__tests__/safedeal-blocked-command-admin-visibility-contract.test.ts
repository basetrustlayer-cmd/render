import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const adminRoutes = readFileSync(resolve(process.cwd(), "src/admin/routes.ts"), "utf8");
const safeDealRoutes = readFileSync(resolve(process.cwd(), "src/safe-deals/routes.ts"), "utf8");

describe("SafeDeal blocked command admin visibility contract", () => {
  it("keeps audit logs visible only to super admins", () => {
    expect(adminRoutes).toContain('app.get("/admin/audit-logs", { preHandler: [authenticate, requireSuperAdmin] }');
    expect(adminRoutes).toContain("prisma.auditLog.findMany");
  });

  it("makes stale SafeDeal command blocks visible through the admin audit log surface", () => {
    expect(safeDealRoutes).toContain("SAFE_DEAL_COMMAND_BLOCKED_STALE_ESCROW_PROJECTION");
    expect(safeDealRoutes).toContain('entityType: "SAFE_DEAL"');
    expect(safeDealRoutes).toContain("entityId: input.safeDeal.id");
    expect(safeDealRoutes).toContain("trustLayerEscrowId: input.safeDeal.trustLayerEscrowId");
  });

  it("does not add a separate blocked-command admin table or financial surface", () => {
    expect(adminRoutes).not.toContain("blockedCommand");
    expect(adminRoutes).not.toContain("staleCommandAdminTable");
    expect(adminRoutes).not.toContain("ledger");
    expect(adminRoutes).not.toContain("settlement");
  });
});
