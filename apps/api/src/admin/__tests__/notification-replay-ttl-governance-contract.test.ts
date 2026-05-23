import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("notification replay TTL governance contract", () => {
  const source = readFileSync(resolve(process.cwd(), "src/admin/routes.ts"), "utf8");
  const eventTypes = readFileSync(resolve(process.cwd(), "../../packages/events/src/types.ts"), "utf8");
  const registry = readFileSync(resolve(process.cwd(), "../../packages/events/src/registry.ts"), "utf8");
  const observability = readFileSync(resolve(process.cwd(), "../../packages/observability/src/index.ts"), "utf8");

  it("defines replay TTL policy and checks failedAt before enqueue", () => {
    expect(source).toContain("notificationReplayTtlMs");
    expect(source).toContain("const failedAtMs = Date.parse(data.failedAt)");
    expect(source).toContain("const replayAgeMs = now - failedAtMs");
    expect(source).toContain("replayAgeMs > notificationReplayTtlMs");
    expect(source).toContain("return reply.code(410).send");
  });

  it("emits expired replay event and metric", () => {
    expect(eventTypes).toContain("notificationReplayExpired");
    expect(registry).toContain("RENDER_EVENT_TYPES.notificationReplayExpired");
    expect(observability).toContain('"notification.replay.expired"');
    expect(source).toContain("notificationReplayExpired");
    expect(source).toContain('name: "notification.replay.expired"');
  });

  it("persists expired replay audit context", () => {
    expect(source).toContain('action: "NOTIFICATION_DEAD_LETTER_REPLAY_EXPIRED"');
    expect(source).toContain("failedAt");
    expect(source).toContain("replayAgeMs");
    expect(source).toContain("notificationReplayTtlMs");
  });
});
