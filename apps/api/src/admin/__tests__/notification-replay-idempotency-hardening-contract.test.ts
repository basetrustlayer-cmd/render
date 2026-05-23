import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("notification replay idempotency hardening contract", () => {
  const source = readFileSync(resolve(process.cwd(), "src/admin/routes.ts"), "utf8");
  const eventTypes = readFileSync(resolve(process.cwd(), "../../packages/events/src/types.ts"), "utf8");
  const registry = readFileSync(resolve(process.cwd(), "../../packages/events/src/registry.ts"), "utf8");
  const observability = readFileSync(resolve(process.cwd(), "../../packages/observability/src/index.ts"), "utf8");

  it("checks for an existing replay request before enqueueing", () => {
    expect(source).toContain("const existingReplayJob = await replayQueue.getJob(replayRequest.idempotencyKey)");
    expect(source).toContain("return reply.code(409).send");
    expect(source).toContain("duplicateRejected: true");
  });

  it("emits duplicate replay rejection event and metric", () => {
    expect(eventTypes).toContain("notificationReplayDuplicateRejected");
    expect(registry).toContain("RENDER_EVENT_TYPES.notificationReplayDuplicateRejected");
    expect(observability).toContain('"notification.replay.duplicate_rejected"');
    expect(source).toContain("notificationReplayDuplicateRejected");
    expect(source).toContain('name: "notification.replay.duplicate_rejected"');
  });

  it("persists duplicate rejection audit context", () => {
    expect(source).toContain('action: "NOTIFICATION_DEAD_LETTER_REPLAY_DUPLICATE_REJECTED"');
    expect(source).toContain("existingReplayJobId");
    expect(source).toContain("idempotencyKey");
  });
});
