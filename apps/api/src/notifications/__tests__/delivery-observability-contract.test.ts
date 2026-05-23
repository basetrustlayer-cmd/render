import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("notification delivery observability contract", () => {
  const observability = readFileSync(resolve(process.cwd(), "../../packages/observability/src/index.ts"), "utf8");
  const routeSource = readFileSync(resolve(process.cwd(), "src/notifications/routes.ts"), "utf8");
  const workerSource = readFileSync(resolve(process.cwd(), "../worker/src/jobs/push-notification-delivery.ts"), "utf8");

  it("defines notification delivery operational metric names", () => {
    expect(observability).toContain('"notification.delivery.queued"');
    expect(observability).toContain('"notification.delivery.started"');
    expect(observability).toContain('"notification.delivery.deferred"');
    expect(observability).toContain('"notification.delivery.failed"');
    expect(observability).toContain('"notification.delivery.duration_ms"');
  });

  it("records queued metrics at the API enqueue boundary", () => {
    expect(routeSource).toContain("recordOperationalMetric");
    expect(routeSource).toContain('name: "notification.delivery.queued"');
    expect(routeSource).toContain('source: "render.api"');
    expect(routeSource).toContain("correlationId: data.correlationId");
  });

  it("records worker lifecycle metrics", () => {
    expect(workerSource).toContain("recordOperationalMetric");
    expect(workerSource).toContain('name: "notification.delivery.started"');
    expect(workerSource).toContain('name: "notification.delivery.deferred"');
    expect(workerSource).toContain('name: "notification.delivery.duration_ms"');
    expect(workerSource).toContain("elapsedMs(startedAt)");
  });

  it("records failed metrics from worker failure handler", () => {
    expect(workerSource).toContain('name: "notification.delivery.failed"');
    expect(workerSource).toContain("pushNotificationDeliveryWorker.on(\"failed\"");
    expect(workerSource).toContain("error: error.message");
  });

  it("preserves provider and TrustLayer boundaries", () => {
    expect(workerSource).not.toContain("firebase");
    expect(workerSource).not.toContain("createTrustLayerClient");
    expect(routeSource).not.toContain("createTrustLayerClient");
  });
});
