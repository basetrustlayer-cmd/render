import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const adminRoutes = readFileSync(
  resolve(process.cwd(), "src/admin/routes.ts"),
  "utf8"
);

const safeDealRoutes = readFileSync(
  resolve(process.cwd(), "src/safe-deals/routes.ts"),
  "utf8"
);

describe("SafeDeal blocked command read-model hardening contract", () => {
  it("exposes audit-log action filtering for blocked SafeDeal commands", () => {
    expect(adminRoutes).toContain('action: z.string().optional()');
    expect(adminRoutes).toContain('parsedQuery.data.action');
  });

  it("keeps audit-log access super-admin scoped", () => {
    expect(adminRoutes).toContain('preHandler: [authenticate, requireSuperAdmin]');
  });

  it("preserves read-only audit log querying semantics", () => {
    expect(adminRoutes).toContain('prisma.auditLog.findMany');
    expect(adminRoutes).not.toContain('prisma.auditLog.update');
    expect(adminRoutes).not.toContain('prisma.auditLog.delete');
  });

  it("supports stale escrow projection blocked command visibility", () => {
    expect(safeDealRoutes).toContain(
      'SAFE_DEAL_COMMAND_BLOCKED_STALE_ESCROW_PROJECTION'
    );
  });
});
