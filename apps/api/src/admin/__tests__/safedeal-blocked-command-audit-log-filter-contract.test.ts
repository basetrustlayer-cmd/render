import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const adminRoutes = readFileSync(resolve(process.cwd(), "src/admin/routes.ts"), "utf8");
const safeDealRoutes = readFileSync(resolve(process.cwd(), "src/safe-deals/routes.ts"), "utf8");

describe("SafeDeal blocked command audit log filter contract", () => {
  it("allows super admins to filter audit logs by action", () => {
    expect(adminRoutes).toContain('app.get("/admin/audit-logs"');
    expect(adminRoutes).toContain("z.object");
    expect(adminRoutes).toContain("action: z.string()");
    expect(adminRoutes).toContain("where");
    expect(adminRoutes).toContain("action: parsedQuery.data.action");
  });

  it("supports SafeDeal stale command block audit visibility", () => {
    expect(safeDealRoutes).toContain("SAFE_DEAL_COMMAND_BLOCKED_STALE_ESCROW_PROJECTION");
  });

  it("keeps audit-log filtering read-only and super-admin scoped", () => {
    expect(adminRoutes).toContain("requireSuperAdmin");
    expect(adminRoutes).toContain("prisma.auditLog.findMany");
    expect(adminRoutes).not.toContain("prisma.auditLog.create");
  });
});
