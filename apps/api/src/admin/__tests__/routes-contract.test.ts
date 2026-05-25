import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("admin route privilege contract", () => {
  const source = readFileSync(resolve(process.cwd(), "src/admin/routes.ts"), "utf8");

  it("keeps platform finance reconciliation restricted to super admins", () => {
    expect(source).toContain(
      'app.get("/admin/finance/reconciliation", { preHandler: [authenticate, requireSuperAdmin] }'
    );
  });

  it("keeps audit logs restricted to super admins", () => {
    expect(source).toContain(
      'app.get("/admin/audit-logs", { preHandler: [authenticate, requireSuperAdmin] }'
    );
  });

  it("keeps user suspension operations restricted to admins", () => {
    expect(source).toContain(
      'app.post("/admin/users/:id/suspend", { preHandler: [authenticate, requireAdmin] }'
    );
    expect(source).toContain(
      'app.post("/admin/users/:id/unsuspend", { preHandler: [authenticate, requireAdmin] }'
    );
  });

  it("keeps listing moderation restricted to moderators or higher", () => {
    expect(source).toContain(
      'app.get("/admin/listings/pending", { preHandler: [authenticate, requireModerator] }'
    );
    expect(source).toContain(
      'app.post("/admin/listings/:id/approve", { preHandler: [authenticate, requireModerator] }'
    );
    expect(source).toContain(
      'app.post("/admin/listings/:id/reject", { preHandler: [authenticate, requireModerator] }'
    );
  });

  it("keeps dispute operations restricted to moderators or higher", () => {
    const disputeRoutes = [
      "/admin/disputes",
      "/admin/disputes/:id",
      "/admin/disputes/:id/note",
      "/admin/disputes/:id/status",
      "/admin/disputes/:id/resolve/buyer-refund",
      "/admin/disputes/:id/resolve/seller-release"
    ];

    for (const route of disputeRoutes) {
      expect(source).toContain(route);
    }

    expect(source.match(/requireModerator/g)?.length ?? 0).toBeGreaterThanOrEqual(8);
  });

  it("uses organization scope helper across tenant-sensitive admin routes", () => {
    expect(source.match(/requireAdminOrganizationScope\(request, reply\)/g)?.length).toBe(10);
  });
  it("keeps webhook event reconciliation read model restricted to super admins", () => {
    expect(source).toContain('app.get("/admin/webhooks/events", { preHandler: [authenticate, requireSuperAdmin] }');
    expect(source).toContain("webhookEventListQuerySchema");
    expect(source).toContain("prisma.webhookEvent.findMany");
    expect(source).toContain("eventId: true");
    expect(source).toContain("processedAt: true");
  });

  it("exposes webhook failure recovery fields in the reconciliation read model", () => {
    expect(source).toContain("failedOnly: z.coerce.boolean().optional()");
    expect(source).toContain('query.data.failedOnly ? { status: "FAILED" }');
    expect(source).toContain("payload: true");
    expect(source).toContain("eventType: true");
  });

});
