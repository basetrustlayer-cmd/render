import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("notification replay worker governance contract", () => {
  const worker = readFileSync(resolve(process.cwd(), "../../apps/worker/src/jobs/notification-replay-request.ts"), "utf8");
  const main = readFileSync(resolve(process.cwd(), "../../apps/worker/src/main.ts"), "utf8");
  const eventTypes = readFileSync(resolve(process.cwd(), "../../packages/events/src/types.ts"), "utf8");
  const observability = readFileSync(resolve(process.cwd(), "../../packages/observability/src/index.ts"), "utf8");

  it("registers a dedicated notification replay request worker", () => {
    expect(worker).toContain("notificationReplayRequestWorker");
    expect(worker).toContain("RENDER_QUEUE_NAMES.notificationReplayRequest");
    expect(main).toContain("notificationReplayRequestWorker");
    expect(main).toContain("RENDER_QUEUE_NAMES.notificationReplayRequest");
    expect(main).toContain("await notificationReplayRequestWorker.close()");
  });

  it("keeps replay governed and manually approved", () => {
    expect(worker).toContain("const manualApproval = true");
    expect(worker).toContain("const automaticReplay = false");
    expect(worker).toContain('replayMode = "MANUAL_OPERATOR_REVIEW_REQUIRED"');
  });

  it("re-enqueues through push delivery queue only after replay request governance", () => {
    expect(worker).toContain("createRenderQueue(RENDER_QUEUE_NAMES.pushNotificationDelivery)");
    expect(worker).toContain('deliveryQueue.add("push-notification-delivery"');
    expect(worker).toContain("notification-replay-delivery:");
  });

  it("defines replay worker events and observability metric", () => {
    expect(eventTypes).toContain("notificationReplayStarted");
    expect(eventTypes).toContain("notificationReplayDeliveryEnqueued");
    expect(observability).toContain('"notification.replay.delivery_enqueued"');
    expect(worker).toContain('event: "notification.replay.delivery_enqueued"');
    expect(worker).toContain('name: "notification.replay.delivery_enqueued"');
  });
});
