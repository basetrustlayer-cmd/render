export type ServiceHealthStatus = "HEALTHY" | "DEGRADED" | "UNHEALTHY";

export function evaluateHealthStatus(input: {
  queueBacklogAgeSeconds?: number;
  maxQueueBacklogAgeSeconds: number;
  retrySaturationPercent?: number;
  failureRatioPercent?: number;
}): ServiceHealthStatus {
  if (
    (input.queueBacklogAgeSeconds ?? 0) > input.maxQueueBacklogAgeSeconds * 2 ||
    (input.retrySaturationPercent ?? 0) >= 80 ||
    (input.failureRatioPercent ?? 0) >= 25
  ) {
    return "UNHEALTHY";
  }

  if (
    (input.queueBacklogAgeSeconds ?? 0) > input.maxQueueBacklogAgeSeconds ||
    (input.retrySaturationPercent ?? 0) >= 50 ||
    (input.failureRatioPercent ?? 0) >= 10
  ) {
    return "DEGRADED";
  }

  return "HEALTHY";
}
