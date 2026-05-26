import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const adminRoutes = readFileSync(resolve(process.cwd(), "src/admin/routes.ts"), "utf8");

describe("Admin audit log actor filter contract", () => {
  it("supports filtering audit logs by actor user id", () => {
    expect(adminRoutes).toContain("actorUserId: z.string().uuid().optional()");
    expect(adminRoutes).toContain("parsedQuery.data.actorUserId");
    expect(adminRoutes).toContain("actorUserId: parsedQuery.data.actorUserId");
  });

  it("preserves existing audit-log filters, time window, and pagination", () => {
    expect(adminRoutes).toContain("parsedQuery.data.action");
    expect(adminRoutes).toContain("parsedQuery.data.entityType");
    expect(adminRoutes).toContain("parsedQuery.data.entityId");
    expect(adminRoutes).toContain("gte: parsedQuery.data.from");
    expect(adminRoutes).toContain("lte: parsedQuery.data.to");
    expect(adminRoutes).toContain("take: parsedQuery.data.take");
  });

  it("keeps audit-log querying super-admin scoped and read-only", () => {
    expect(adminRoutes).toContain('app.get("/admin/audit-logs", { preHandler: [authenticate, requireSuperAdmin] }');
    expect(adminRoutes).toContain("prisma.auditLog.findMany");
    expect(adminRoutes).not.toContain("prisma.auditLog.update");
    expect(adminRoutes).not.toContain("prisma.auditLog.delete");
  });
});
