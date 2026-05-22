import { describe, expect, it } from "vitest";
import { evaluateHealthStatus } from "../health.js";

describe("health governance", () => {
  it("returns HEALTHY when signals are within limits", () => {
    expect(
      evaluateHealthStatus({
        queueBacklogAgeSeconds: 10,
        maxQueueBacklogAgeSeconds: 120,
        retrySaturationPercent: 5,
        failureRatioPercent: 1
      })
    ).toBe("HEALTHY");
  });

  it("returns DEGRADED when queue backlog exceeds threshold", () => {
    expect(
      evaluateHealthStatus({
        queueBacklogAgeSeconds: 121,
        maxQueueBacklogAgeSeconds: 120
      })
    ).toBe("DEGRADED");
  });

  it("returns UNHEALTHY when retry saturation is severe", () => {
    expect(
      evaluateHealthStatus({
        maxQueueBacklogAgeSeconds: 120,
        retrySaturationPercent: 80
      })
    ).toBe("UNHEALTHY");
  });
});
