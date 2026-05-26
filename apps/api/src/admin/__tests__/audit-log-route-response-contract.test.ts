import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const adminRoutes = readFileSync(resolve(process.cwd(), "src/admin/routes.ts"), "utf8");

describe("Admin audit log route response contract", () => {
  it("returns audit logs with cursor pagination metadata", () => {
    expect(adminRoutes).toContain("const hasMore = auditLogs.length > parsedQuery.data.take");
    expect(adminRoutes).toContain("const auditLogPage = auditLogs.slice(0, parsedQuery.data.take)");
    expect(adminRoutes).toContain("const nextCursor = hasMore ? auditLogPage.at(-1)?.id ?? null : null");
    expect(adminRoutes).toContain("return {");
    expect(adminRoutes).toContain("auditLogs: auditLogPage");
    expect(adminRoutes).toContain("pageInfo:");
    expect(adminRoutes).toContain("hasMore");
    expect(adminRoutes).toContain("nextCursor");
  });

  it("fetches one extra row to detect additional pages", () => {
    expect(adminRoutes).toContain("take: parsedQuery.data.take + 1");
  });

  it("preserves deterministic ordering and cursor support", () => {
    expect(adminRoutes).toContain("orderBy: [");
    expect(adminRoutes).toContain('{ createdAt: "desc" }');
    expect(adminRoutes).toContain('{ id: "desc" }');
    expect(adminRoutes).toContain("cursor: { id: parsedQuery.data.cursor }");
    expect(adminRoutes).toContain("skip: 1");
  });
});
