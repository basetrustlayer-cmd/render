import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("notification replay summary read model contract", () => {
  const source = readFileSync(resolve(process.cwd(), "src/admin/routes.ts"), "utf8");
  const observability = readFileSync(resolve(process.cwd(), "../../packages/observability/src/index.ts"), "utf8");
  const schema = readFileSync(resolve(process.cwd(), "prisma/schema.prisma"), "utf8");

  it("exposes a super-admin replay summary read model endpoint", () => {
    expect(source).toContain('app.get("/admin/notifications/replay-summary"');
    expect(source).toContain("preHandler: [authenticate, requireSuperAdmin]");
    expect(source).toContain("ADMIN_NOTIFICATION_REPLAY_SUMMARY_VIEWED");
  });

  it("summarizes replay outcomes from audit logs and dead-letter queue state", () => {
    expect(source).toContain("replayReadyCount");
    expect(source).toContain("requestedCount");
    expect(source).toContain("duplicateRejectedCount");
    expect(source).toContain("rateLimitedCount");
    expect(source).toContain("expiredCount");
    expect(source).toContain("blockedCount");
    expect(source).toContain("queue.getJobCounts");
  });

  it("records summary observability without adding persistence tables", () => {
    expect(observability).toContain('"notification.replay.summary_viewed"');
    expect(source).toContain('name: "notification.replay.summary_viewed"');
    expect(schema).not.toContain("model NotificationReplay");
    expect(schema).not.toContain("model NotificationReplaySummary");
  });
});
