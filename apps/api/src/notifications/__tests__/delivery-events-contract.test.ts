import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("notification delivery event contract", () => {
  const eventTypes = readFileSync(resolve(process.cwd(), "../../packages/events/src/types.ts"), "utf8");
  const registry = readFileSync(resolve(process.cwd(), "../../packages/events/src/registry.ts"), "utf8");
  const routeSource = readFileSync(resolve(process.cwd(), "src/notifications/routes.ts"), "utf8");
  const workerSource = readFileSync(resolve(process.cwd(), "../worker/src/jobs/push-notification-delivery.ts"), "utf8");

  it("defines notification delivery lifecycle event types", () => {
    expect(eventTypes).toContain('notificationDeliveryQueued: "render.notification.delivery_queued"');
    expect(eventTypes).toContain('notificationDeliveryStarted: "render.notification.delivery_started"');
    expect(eventTypes).toContain('notificationDeliveryDeferred: "render.notification.delivery_deferred"');
    expect(eventTypes).toContain('notificationDeliveryFailed: "render.notification.delivery_failed"');
  });

  it("registers notification delivery events in the canonical registry", () => {
    expect(registry).toContain("RENDER_EVENT_TYPES.notificationDeliveryQueued");
    expect(registry).toContain("RENDER_EVENT_TYPES.notificationDeliveryStarted");
    expect(registry).toContain("RENDER_EVENT_TYPES.notificationDeliveryDeferred");
    expect(registry).toContain("RENDER_EVENT_TYPES.notificationDeliveryFailed");
    expect(registry).toContain('aggregate: "notification_delivery"');
    expect(registry).toContain("future retry and dead-letter queue");
  });

  it("emits queued events from the notification API boundary", () => {
    expect(routeSource).toContain("createRenderEvent");
    expect(routeSource).toContain("RENDER_EVENT_TYPES.notificationDeliveryQueued");
    expect(routeSource).toContain("notificationDeliveryQueuedEvent");
    expect(routeSource).toContain('status: "QUEUED"');
  });

  it("emits started and deferred events from the worker boundary", () => {
    expect(workerSource).toContain("createRenderEvent");
    expect(workerSource).toContain("RENDER_EVENT_TYPES.notificationDeliveryStarted");
    expect(workerSource).toContain("RENDER_EVENT_TYPES.notificationDeliveryDeferred");
    expect(workerSource).toContain("notificationDeliveryStartedEvent");
    expect(workerSource).toContain("notificationDeliveryDeferredEvent");
    expect(workerSource).toContain('status: "PROVIDER_DELIVERY_PENDING"');
  });

  it("keeps provider delivery and TrustLayer coupling out of C47", () => {
    expect(workerSource).not.toContain("firebase");
    expect(workerSource).not.toContain("createTrustLayerClient");
    expect(routeSource).not.toContain("createTrustLayerClient");
  });
});
