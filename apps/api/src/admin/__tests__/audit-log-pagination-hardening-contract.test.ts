import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const adminRoutes = readFileSync(resolve(process.cwd(), "src/admin/routes.ts"), "utf8");

describe("Admin audit log pagination hardening contract", () => {
  it("bounds audit-log take query parameters", () => {
    expect(adminRoutes).toContain("take: z.coerce.number().int().min(1).max(100).default(100)");
    expect(adminRoutes).toContain("take: parsedQuery.data.take");
  });

  it("preserves action and entity filters", () => {
    expect(adminRoutes).toContain("parsedQuery.data.action");
    expect(adminRoutes).toContain("parsedQuery.data.entityType");
    expect(adminRoutes).toContain("parsedQuery.data.entityId");
  });

  it("keeps audit-log querying super-admin scoped and read-only", () => {
    expect(adminRoutes).toContain('app.get("/admin/audit-logs", { preHandler: [authenticate, requireSuperAdmin] }');
    expect(adminRoutes).toContain("prisma.auditLog.findMany");
    expect(adminRoutes).not.toContain("prisma.auditLog.update");
    expect(adminRoutes).not.toContain("prisma.auditLog.delete");
  });
});
