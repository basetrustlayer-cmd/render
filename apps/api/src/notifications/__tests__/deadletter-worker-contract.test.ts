import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("notification dead-letter worker contract", () => {
  const worker = readFileSync(resolve(process.cwd(), "../../apps/worker/src/jobs/notification-dead-letter.ts"), "utf8");
  const main = readFileSync(resolve(process.cwd(), "../../apps/worker/src/main.ts"), "utf8");
  const eventTypes = readFileSync(resolve(process.cwd(), "../../packages/events/src/types.ts"), "utf8");
  const registry = readFileSync(resolve(process.cwd(), "../../packages/events/src/registry.ts"), "utf8");
  const observability = readFileSync(resolve(process.cwd(), "../../packages/observability/src/index.ts"), "utf8");

  it("registers a dedicated notification dead-letter worker", () => {
    expect(worker).toContain("notificationDeadLetterWorker");
    expect(worker).toContain("RENDER_QUEUE_NAMES.notificationDeadLetter");
    expect(main).toContain("notificationDeadLetterWorker");
    expect(main).toContain("RENDER_QUEUE_NAMES.notificationDeadLetter");
    expect(main).toContain("await notificationDeadLetterWorker.close()");
  });

  it("defines dead-letter processed and replay-ready events", () => {
    expect(eventTypes).toContain("notificationDeadLetterProcessed");
    expect(eventTypes).toContain("notificationDeadLetterReplayReady");
    expect(registry).toContain("RENDER_EVENT_TYPES.notificationDeadLetterProcessed");
    expect(registry).toContain("RENDER_EVENT_TYPES.notificationDeadLetterReplayReady");
    expect(registry).toContain("apps/worker/src/jobs/notification-dead-letter.ts");
  });

  it("marks failed notification payloads as replay-ready without replaying automatically", () => {
    expect(worker).toContain("REPLAY_READY");
    expect(worker).toContain("MANUAL_OPERATOR_REVIEW_REQUIRED");
    expect(worker).toContain("replayReady: true");
    expect(worker).not.toContain("pushNotificationDeliveryWorker.add");
    expect(worker).not.toContain("createRenderQueue(RENDER_QUEUE_NAMES.pushNotificationDelivery)");
  });

  it("emits dead-letter observability metrics and logs", () => {
    expect(observability).toContain('"notification.dead_letter.processed"');
    expect(observability).toContain('"notification.dead_letter.replayed_pending"');
    expect(worker).toContain('event: "notification.dead_letter.processed"');
    expect(worker).toContain('name: "notification.dead_letter.processed"');
    expect(worker).toContain('name: "notification.dead_letter.replayed_pending"');
  });

  it("preserves provider and TrustLayer boundaries", () => {
    expect(worker).not.toContain("FIREBASE");
    expect(worker).not.toContain("fetch(");
    expect(worker).not.toContain("createTrustLayerClient");
    expect(worker).not.toContain("trustScore");
    expect(worker).not.toContain("escrow");
    expect(worker).not.toContain("settlement");
  });
});
