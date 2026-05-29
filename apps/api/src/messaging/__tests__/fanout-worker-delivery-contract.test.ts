import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("messaging notification fanout worker delivery contract", () => {
  const worker = readFileSync(
    resolve(process.cwd(), "../../apps/worker/src/jobs/messaging-notification-fanout.ts"),
    "utf8"
  );

  const observability = readFileSync(
    resolve(process.cwd(), "../../packages/observability/src/index.ts"),
    "utf8"
  );

  it("queues push delivery jobs for messaging fanout recipients", () => {
    expect(worker).toContain("messagingNotificationFanoutWorker");
    expect(worker).toContain("createRenderQueue(RENDER_QUEUE_NAMES.pushNotificationDelivery)");
    expect(worker).toContain("type PushNotificationDeliveryJobData");
    expect(worker).toContain("job.data.recipientUserIds.map");
    expect(worker).toContain('deliveryQueue.add("push-notification-delivery"');
    expect(worker).toContain("messaging-fanout:${job.data.eventId}:${userId}");
  });

  it("records fanout delivery observability", () => {
    expect(observability).toContain('"messaging.notification_fanout.delivery_queued"');
    expect(worker).toContain('name: "messaging.notification_fanout.delivery_queued"');
    expect(worker).toContain('source: "render.worker"');
    expect(worker).toContain("recipientCount");
  });

  it("does not call external providers directly from messaging fanout", () => {
    expect(worker).not.toContain("fetch(");
    expect(worker).not.toContain("Firebase");
    expect(worker).not.toContain("Hubtel");
    expect(worker).not.toContain("Resend");
  });
});
