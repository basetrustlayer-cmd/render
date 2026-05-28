import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("runtime SLO consumer contract", () => {
  const sloRegistry = readFileSync(
    resolve(process.cwd(), "../../packages/observability/src/slo.ts"),
    "utf8",
  );

  const pushWorker = readFileSync(
    resolve(process.cwd(), "../worker/src/jobs/push-notification-delivery.ts"),
    "utf8",
  );

  const webhookReplayWorker = readFileSync(
    resolve(process.cwd(), "../worker/src/jobs/webhook-replay-request.ts"),
    "utf8",
  );

  it("exposes standardized breach metadata for runtime consumers", () => {
    expect(sloRegistry).toContain("getOperationalSloBreachMetadata");
    expect(sloRegistry).toContain("sloBreached");
    expect(sloRegistry).toContain("observedValue");
    expect(sloRegistry).toContain("sloSeverity");
  });

  it("annotates notification delivery duration metrics with SLO metadata", () => {
    expect(pushWorker).toContain("getOperationalSloBreachMetadata");
    expect(pushWorker).toContain('name: "notification.delivery.duration_ms"');
    expect(pushWorker).toContain("deliveryDurationMs");
  });

  it("annotates retry exhaustion and dead-letter metrics with SLO metadata", () => {
    expect(pushWorker).toContain('name: "notification.delivery.retry_exhausted"');
    expect(pushWorker).toContain('name: "notification.dead_letter.queued"');
    expect(pushWorker).toContain("getOperationalSloBreachMetadata");
  });

  it("annotates webhook replay request metrics with SLO metadata", () => {
    expect(webhookReplayWorker).toContain("getOperationalSloBreachMetadata");
    expect(webhookReplayWorker).toContain('name: "webhook.replay.requested"');
  });
});
