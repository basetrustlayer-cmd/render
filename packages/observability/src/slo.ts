export type OperationalSloName =
  | "api.request.completed"
  | "webhook.processing.duration_ms"
  | "trustlayer.request.duration_ms"
  | "notification.delivery.duration_ms"
  | "notification.delivery.retry_exhausted"
  | "notification.dead_letter.queued"
  | "notification.replay.rate_limited"
  | "webhook.replay.requested";

export type OperationalSloDefinition = {
  name: OperationalSloName;
  threshold: number;
  unit: "count" | "ms" | "ratio";
  severity: "WARN" | "ERROR" | "CRITICAL";
  description: string;
};

export const operationalSloRegistry: Record<OperationalSloName, OperationalSloDefinition> = {
  "api.request.completed": {
    name: "api.request.completed",
    threshold: 1000,
    unit: "ms",
    severity: "WARN",
    description: "API request latency should remain under 1s for launch readiness."
  },
  "webhook.processing.duration_ms": {
    name: "webhook.processing.duration_ms",
    threshold: 1500,
    unit: "ms",
    severity: "ERROR",
    description: "TrustLayer webhook processing should remain under 1.5s."
  },
  "trustlayer.request.duration_ms": {
    name: "trustlayer.request.duration_ms",
    threshold: 2000,
    unit: "ms",
    severity: "ERROR",
    description: "Outbound TrustLayer calls should remain under 2s."
  },
  "notification.delivery.duration_ms": {
    name: "notification.delivery.duration_ms",
    threshold: 3000,
    unit: "ms",
    severity: "WARN",
    description: "Notification delivery jobs should complete under 3s."
  },
  "notification.delivery.retry_exhausted": {
    name: "notification.delivery.retry_exhausted",
    threshold: 0,
    unit: "count",
    severity: "ERROR",
    description: "Retry exhaustion must remain visible as a launch-readiness breach."
  },
  "notification.dead_letter.queued": {
    name: "notification.dead_letter.queued",
    threshold: 0,
    unit: "count",
    severity: "ERROR",
    description: "Dead-letter queue growth must be treated as launch risk."
  },
  "notification.replay.rate_limited": {
    name: "notification.replay.rate_limited",
    threshold: 0,
    unit: "count",
    severity: "WARN",
    description: "Replay rate limiting should be visible to operators."
  },
  "webhook.replay.requested": {
    name: "webhook.replay.requested",
    threshold: 25,
    unit: "count",
    severity: "WARN",
    description: "Webhook replay volume above threshold may indicate sync drift."
  }
};

export function getOperationalSloDefinition(name: OperationalSloName): OperationalSloDefinition {
  return operationalSloRegistry[name];
}

export function isOperationalSloBreached(input: {
  name: OperationalSloName;
  value: number;
}): boolean {
  const definition = getOperationalSloDefinition(input.name);
  return input.value > definition.threshold;
}
