import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const adminRoutes = readFileSync(resolve(process.cwd(), "src/admin/routes.ts"), "utf8");

describe("Admin audit log entity filter contract", () => {
  it("supports filtering audit logs by action and entity fields", () => {
    expect(adminRoutes).toContain("action: z.string().optional()");
    expect(adminRoutes).toContain("entityType: z.string().optional()");
    expect(adminRoutes).toContain("entityId: z.string().optional()");
    expect(adminRoutes).toContain("parsedQuery.data.entityType");
    expect(adminRoutes).toContain("parsedQuery.data.entityId");
  });

  it("keeps audit log filtering super-admin scoped and read-only", () => {
    expect(adminRoutes).toContain('app.get("/admin/audit-logs", { preHandler: [authenticate, requireSuperAdmin] }');
    expect(adminRoutes).toContain("prisma.auditLog.findMany");
    expect(adminRoutes).not.toContain("prisma.auditLog.update");
    expect(adminRoutes).not.toContain("prisma.auditLog.delete");
  });
});
