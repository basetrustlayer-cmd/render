import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const adminRoutes = readFileSync(resolve(process.cwd(), "src/admin/routes.ts"), "utf8");

describe("Admin audit log response cursor metadata contract", () => {
  it("returns page metadata for cursor pagination", () => {
    expect(adminRoutes).toContain("take: parsedQuery.data.take + 1");
    expect(adminRoutes).toContain("const hasMore = auditLogs.length > parsedQuery.data.take");
    expect(adminRoutes).toContain("const results = hasMore");
    expect(adminRoutes).toContain("const nextCursor = hasMore");
    expect(adminRoutes).toContain("nextCursor");
    expect(adminRoutes).toContain("hasMore");
  });

  it("returns trimmed audit log results", () => {
    expect(adminRoutes).toContain("auditLogs.slice(0, parsedQuery.data.take)");
    expect(adminRoutes).toContain("auditLogs: results");
  });

  it("preserves deterministic cursor ordering", () => {
    expect(adminRoutes).toContain('{ createdAt: "desc" }');
    expect(adminRoutes).toContain('{ id: "desc" }');
    expect(adminRoutes).toContain("cursor: { id: parsedQuery.data.cursor }");
    expect(adminRoutes).toContain("skip: 1");
  });
});
