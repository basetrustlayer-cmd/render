import { createRenderEvent, type RenderEventEnvelope } from "@render/events";

export type OperationalSeverity = "INFO" | "WARN" | "ERROR" | "CRITICAL";

export type OperationalMetricName =
  | "api.request.completed"
  | "auth.failure.recorded"
  | "webhook.processing.duration_ms"
  | "settlement.processing.duration_ms"
  | "settlement.retry.exhausted"
  | "dispute.resolution.duration_ms"
  | "trustlayer.request.duration_ms"
  | "risk.signal.detected";

export type OperationalLogInput = {
  severity: OperationalSeverity;
  event: string;
  message: string;
  correlationId: string;
  aggregateId?: string;
  causationId?: string;
  source: "render.api" | "render.worker" | "render.web" | "trustlayer" | "paystack.transitional";
  metadata?: Record<string, unknown>;
};

export type OperationalMetricInput = {
  name: OperationalMetricName;
  value: number;
  unit: "count" | "ms" | "ratio";
  correlationId: string;
  aggregateId: string;
  source: "render.api" | "render.worker" | "render.web" | "trustlayer" | "paystack.transitional";
  metadata?: Record<string, unknown>;
};

export function writeOperationalLog(input: OperationalLogInput): RenderEventEnvelope<Record<string, unknown>> {
  const event = createRenderEvent({
    id: crypto.randomUUID(),
    type: `render.ops.${input.event}`,
    aggregateId: input.aggregateId ?? input.correlationId,
    correlationId: input.correlationId,
    causationId: input.causationId,
    source: input.source,
    payload: {
      severity: input.severity,
      message: input.message
    },
    metadata: input.metadata
  });

  const logMethod =
    input.severity === "CRITICAL" || input.severity === "ERROR"
      ? console.error
      : input.severity === "WARN"
        ? console.warn
        : console.log;

  logMethod(JSON.stringify(event));
  return event;
}

export function recordOperationalMetric(input: OperationalMetricInput): RenderEventEnvelope<Record<string, unknown>> {
  const event = createRenderEvent({
    id: crypto.randomUUID(),
    type: `render.metric.${input.name}`,
    aggregateId: input.aggregateId,
    correlationId: input.correlationId,
    source: input.source,
    payload: {
      name: input.name,
      value: input.value,
      unit: input.unit
    },
    metadata: input.metadata
  });

  console.log(JSON.stringify(event));
  return event;
}

export function nowMs(): number {
  return Date.now();
}

export function elapsedMs(startedAtMs: number): number {
  return Date.now() - startedAtMs;
}
