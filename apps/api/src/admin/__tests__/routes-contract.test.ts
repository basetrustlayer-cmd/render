import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = fs.readFileSync(
  path.resolve(process.cwd(), "src/admin/routes.ts"),
  "utf8"
);

describe("admin route privilege contract", () => {
  it("keeps audit logs restricted to super admins", () => {
    expect(source).toContain(
      'app.get("/admin/audit-logs", { preHandler: [authenticate, requireSuperAdmin] }'
    );
  });

  it("keeps webhook replay operations restricted to super admins", () => {
    expect(source).toContain(
      'app.post("/admin/webhooks/events/:id/replay-request", { preHandler: [authenticate, requireSuperAdmin] }'
    );
  });

  it("keeps notification replay operations restricted to super admins", () => {
    expect(source).toContain(
      'app.post("/admin/notifications/dead-letter/:id/replay-request", { preHandler: [authenticate, requireSuperAdmin] }'
    );
  });

  it("keeps dispute operations restricted to moderators or higher", () => {
    expect(source).toContain('/admin/disputes');
    expect(source).toContain('/admin/disputes/:id');
    expect(source).toContain('/admin/disputes/:id/note');
    expect(source).toContain('/admin/disputes/:id/status');

    expect(source).toContain("requireModerator");

    expect(source).not.toContain(
      '/admin/disputes/:id/resolve/buyer-refund'
    );

    expect(source).not.toContain(
      '/admin/disputes/:id/resolve/seller-release'
    );
  });

  it("keeps user moderation restricted to admins", () => {
    expect(source).toContain(
      'app.post("/admin/users/:id/suspend", { preHandler: [authenticate, requireAdmin] }'
    );
  });
});
