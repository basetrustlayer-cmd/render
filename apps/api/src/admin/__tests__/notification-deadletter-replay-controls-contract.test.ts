import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("notification dead-letter replay controls contract", () => {
  const adminRoutes = readFileSync(resolve(process.cwd(), "src/admin/routes.ts"), "utf8");
  const queue = readFileSync(resolve(process.cwd(), "../../packages/queue/src/index.ts"), "utf8");
  const eventTypes = readFileSync(resolve(process.cwd(), "../../packages/events/src/types.ts"), "utf8");
  const registry = readFileSync(resolve(process.cwd(), "../../packages/events/src/registry.ts"), "utf8");
  const observability = readFileSync(resolve(process.cwd(), "../../packages/observability/src/index.ts"), "utf8");

  it("defines a manual replay request queue and typed payload", () => {
    expect(queue).toContain('notificationReplayRequest: "render.notification.replay_request"');
    expect(queue).toContain("export type NotificationReplayRequestJobData");
    expect(queue).toContain("approvedByUserId: string");
    expect(queue).toContain("idempotencyKey: string");
  });

  it("adds replay requested and blocked event contracts", () => {
    expect(eventTypes).toContain("notificationReplayRequested");
    expect(eventTypes).toContain("notificationReplayBlocked");
    expect(registry).toContain("RENDER_EVENT_TYPES.notificationReplayRequested");
    expect(registry).toContain("RENDER_EVENT_TYPES.notificationReplayBlocked");
  });

  it("adds super-admin gated replay control endpoint", () => {
    expect(adminRoutes).toContain('app.post("/admin/notifications/dead-letter/:id/replay-request"');
    expect(adminRoutes).toContain("requireSuperAdmin");
    expect(adminRoutes).toContain("NOTIFICATION_DEAD_LETTER_REPLAY_REQUESTED");
    expect(adminRoutes).toContain("createRenderQueue(RENDER_QUEUE_NAMES.notificationReplayRequest)");
  });

  it("keeps replay manual and policy-gated", () => {
    expect(adminRoutes).toContain("const manualApproval = true");
    expect(adminRoutes).toContain("const automaticReplay = false");
    expect(adminRoutes).toContain("MANUAL_OPERATOR_REVIEW_REQUIRED");
  });

  it("adds replay observability metrics", () => {
    expect(observability).toContain('"notification.replay.requested"');
    expect(observability).toContain('"notification.replay.blocked"');
  });
});
