import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("notification delivery retry and dead-letter contract", () => {
  const queue = readFileSync(resolve(process.cwd(), "../../packages/queue/src/index.ts"), "utf8");
  const eventTypes = readFileSync(resolve(process.cwd(), "../../packages/events/src/types.ts"), "utf8");
  const registry = readFileSync(resolve(process.cwd(), "../../packages/events/src/registry.ts"), "utf8");
  const observability = readFileSync(resolve(process.cwd(), "../../packages/observability/src/index.ts"), "utf8");
  const worker = readFileSync(resolve(process.cwd(), "../worker/src/jobs/push-notification-delivery.ts"), "utf8");

  it("defines a notification dead-letter queue and typed payload", () => {
    expect(queue).toContain('notificationDeadLetter: "render.notification.dead_letter"');
    expect(queue).toContain("export type NotificationDeadLetterJobData");
    expect(queue).toContain("originalQueue: typeof RENDER_QUEUE_NAMES.pushNotificationDelivery");
    expect(queue).toContain("[RENDER_QUEUE_NAMES.notificationDeadLetter]: NotificationDeadLetterJobData");
  });

  it("defines retry exhaustion and dead-letter events", () => {
    expect(eventTypes).toContain('notificationDeliveryRetryExhausted: "render.notification.delivery_retry_exhausted"');
    expect(eventTypes).toContain('notificationDeadLetterQueued: "render.notification.dead_letter_queued"');
    expect(registry).toContain("RENDER_EVENT_TYPES.notificationDeliveryRetryExhausted");
    expect(registry).toContain("RENDER_EVENT_TYPES.notificationDeadLetterQueued");
    expect(registry).toContain("dead-letter queue");
  });

  it("defines retry and dead-letter observability metrics", () => {
    expect(observability).toContain('"notification.delivery.retry_exhausted"');
    expect(observability).toContain('"notification.dead_letter.queued"');
  });

  it("moves exhausted push delivery failures to dead-letter queue", () => {
    expect(worker).toContain("MAX_PUSH_NOTIFICATION_ATTEMPTS");
    expect(worker).toContain("job.attemptsMade");
    expect(worker).toContain("retryExhausted");
    expect(worker).toContain("createRenderQueue(RENDER_QUEUE_NAMES.notificationDeadLetter)");
    expect(worker).toContain('deadLetterQueue.add("notification-dead-letter", deadLetterData)');
  });

  it("preserves provider and TrustLayer boundaries", () => {
    expect(worker).not.toContain("firebase");
    expect(worker).not.toContain("createTrustLayerClient");
  });
});
