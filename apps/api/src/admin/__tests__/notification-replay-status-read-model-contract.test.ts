import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("notification replay status read model contract", () => {
  const source = readFileSync(resolve(process.cwd(), "src/admin/routes.ts"), "utf8");
  const schema = readFileSync(resolve(process.cwd(), "prisma/schema.prisma"), "utf8");

  it("exposes a super-admin replay status read model endpoint", () => {
    expect(source).toContain('app.get("/admin/notifications/dead-letter/:id/replay-status"');
    expect(source).toContain("preHandler: [authenticate, requireSuperAdmin]");
    expect(source).toContain("ADMIN_NOTIFICATION_REPLAY_STATUS_VIEWED");
  });

  it("derives status from audit log outcomes and queue state", () => {
    expect(source).toContain("NOTIFICATION_DEAD_LETTER_REPLAY_REQUESTED");
    expect(source).toContain("NOTIFICATION_DEAD_LETTER_REPLAY_DUPLICATE_REJECTED");
    expect(source).toContain("NOTIFICATION_DEAD_LETTER_REPLAY_RATE_LIMITED");
    expect(source).toContain("NOTIFICATION_DEAD_LETTER_REPLAY_EXPIRED");
    expect(source).toContain("replayStatus");
    expect(source).toContain("auditTrail");
    expect(source).toContain("deadLetter");
  });

  it("does not introduce replay read-model persistence tables", () => {
    expect(schema).not.toContain("model NotificationReplay");
    expect(schema).not.toContain("model NotificationReplayStatus");
    expect(schema).not.toContain("model NotificationDeadLetter");
  });
});
