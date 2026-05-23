import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("notification replay audit persistence contract", () => {
  const source = readFileSync(resolve(process.cwd(), "src/admin/routes.ts"), "utf8");
  const schema = readFileSync(resolve(process.cwd(), "prisma/schema.prisma"), "utf8");

  it("persists blocked replay attempts to audit logs", () => {
    expect(source).toContain('action: "NOTIFICATION_DEAD_LETTER_REPLAY_BLOCKED"');
    expect(source).toContain('reason: "DEAD_LETTER_JOB_NOT_FOUND"');
    expect(source).toContain("blockedEvent");
  });

  it("persists replay request context to audit logs", () => {
    expect(source).toContain('action: "NOTIFICATION_DEAD_LETTER_REPLAY_REQUESTED"');
    expect(source).toContain("requestedEvent");
    expect(source).toContain("originalQueue");
    expect(source).toContain("deadLetterJobId");
    expect(source).toContain("idempotencyKey");
  });

  it("does not introduce replay persistence tables in this slice", () => {
    expect(schema).not.toContain("model NotificationReplay");
    expect(schema).not.toContain("model NotificationDeadLetter");
  });
});
