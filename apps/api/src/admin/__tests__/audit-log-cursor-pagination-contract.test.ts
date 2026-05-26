import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const adminRoutes = readFileSync(resolve(process.cwd(), "src/admin/routes.ts"), "utf8");

describe("Admin audit log cursor pagination contract", () => {
  it("supports deterministic cursor pagination", () => {
    expect(adminRoutes).toContain("cursor: z.string().uuid().optional()");
    expect(adminRoutes).toContain("orderBy: [");
    expect(adminRoutes).toContain('{ createdAt: "desc" }');
    expect(adminRoutes).toContain('{ id: "desc" }');
    expect(adminRoutes).toContain("cursor: { id: parsedQuery.data.cursor }");
    expect(adminRoutes).toContain("skip: 1");
    expect(adminRoutes).toContain("take: parsedQuery.data.take");
  });

  it("preserves existing audit-log filters", () => {
    expect(adminRoutes).toContain("parsedQuery.data.action");
    expect(adminRoutes).toContain("parsedQuery.data.entityType");
    expect(adminRoutes).toContain("parsedQuery.data.entityId");
    expect(adminRoutes).toContain("parsedQuery.data.actorUserId");
    expect(adminRoutes).toContain("gte: parsedQuery.data.from");
    expect(adminRoutes).toContain("lte: parsedQuery.data.to");
  });

  it("keeps audit-log querying super-admin scoped and read-only", () => {
    expect(adminRoutes).toContain('app.get("/admin/audit-logs", { preHandler: [authenticate, requireSuperAdmin] }');
    expect(adminRoutes).toContain("prisma.auditLog.findMany");
    expect(adminRoutes).not.toContain("prisma.auditLog.update");
    expect(adminRoutes).not.toContain("prisma.auditLog.delete");
  });
});
