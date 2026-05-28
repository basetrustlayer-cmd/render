import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("runtime SLO enforcement contract", () => {
  const observabilityIndex = readFileSync(
    resolve(process.cwd(), "../../packages/observability/src/index.ts"),
    "utf8",
  );

  const sloRegistry = readFileSync(
    resolve(process.cwd(), "../../packages/observability/src/slo.ts"),
    "utf8",
  );

  it("exports a shared operational SLO registry from observability", () => {
    expect(observabilityIndex).toContain('export * from "./slo.js";');
    expect(sloRegistry).toContain("operationalSloRegistry");
    expect(sloRegistry).toContain("getOperationalSloDefinition");
    expect(sloRegistry).toContain("isOperationalSloBreached");
  });

  it("tracks launch-critical Render and TrustLayer latency SLOs", () => {
    expect(sloRegistry).toContain('"api.request.completed"');
    expect(sloRegistry).toContain('"webhook.processing.duration_ms"');
    expect(sloRegistry).toContain('"trustlayer.request.duration_ms"');
    expect(sloRegistry).toContain('"notification.delivery.duration_ms"');
  });

  it("tracks launch-critical retry, dead-letter, and replay saturation SLOs", () => {
    expect(sloRegistry).toContain('"notification.delivery.retry_exhausted"');
    expect(sloRegistry).toContain('"notification.dead_letter.queued"');
    expect(sloRegistry).toContain('"notification.replay.rate_limited"');
    expect(sloRegistry).toContain('"webhook.replay.requested"');
  });

  it("keeps SLO breach evaluation threshold based and deterministic", () => {
    expect(sloRegistry).toContain("input.value > definition.threshold");
    expect(sloRegistry).not.toContain("fetch(");
    expect(sloRegistry).not.toContain("process.env");
  });
});
