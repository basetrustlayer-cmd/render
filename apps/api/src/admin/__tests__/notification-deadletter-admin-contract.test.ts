import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("admin notification dead-letter visibility contract", () => {
  const source = readFileSync(resolve(process.cwd(), "src/admin/routes.ts"), "utf8");

  it("exposes notification dead-letter visibility only to super admins", () => {
    expect(source).toContain('app.get("/admin/notifications/dead-letter", { preHandler: [authenticate, requireSuperAdmin] }');
    expect(source).toContain("ADMIN_NOTIFICATION_DEAD_LETTERS_VIEWED");
  });

  it("reads from the notification dead-letter queue without replaying", () => {
    expect(source).toContain("createRenderQueue(RENDER_QUEUE_NAMES.notificationDeadLetter)");
    expect(source).toContain("queue.getJobs([parsed.data.status]");
    expect(source).toContain("await queue.close()");
    expect(source).toContain("replayEnabled: false");
    expect(source).toContain('replayMode: "MANUAL_OPERATOR_REVIEW_REQUIRED"');
    expect(source).not.toContain(".add(\"push-notification-delivery\"");
    expect(source).not.toContain('.add("push-notification-delivery"');
  });

  it("bounds dead-letter query scope", () => {
    expect(source).toContain('z.enum(["waiting", "delayed", "failed", "completed"]).default("waiting")');
    expect(source).toContain("z.coerce.number().int().min(1).max(100).default(50)");
    expect(source).toContain("Invalid dead-letter query.");
  });
});
