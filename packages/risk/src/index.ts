import { createRenderEvent } from "@render/events";
import { recordOperationalMetric, writeOperationalLog } from "@render/observability";

export type RiskSignalType =
  | "ACCOUNT_VELOCITY"
  | "DEVICE_MISMATCH"
  | "DISPUTE_CLUSTER"
  | "PAYMENT_ANOMALY"
  | "ESCROW_BEHAVIOR"
  | "MESSAGE_ABUSE";

export type RiskSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type RiskSignalInput = {
  signalType: RiskSignalType;
  severity: RiskSeverity;
  aggregateId: string;
  correlationId: string;
  source: "render.api" | "render.worker";
  actorUserId?: string;
  metadata?: Record<string, unknown>;
};

export function createRiskSignal(input: RiskSignalInput) {
  const event = createRenderEvent({
    id: crypto.randomUUID(),
    type: "render.risk.signal_detected",
    aggregateId: input.aggregateId,
    correlationId: input.correlationId,
    source: input.source,
    payload: {
      signalType: input.signalType,
      severity: input.severity,
      actorUserId: input.actorUserId
    },
    metadata: input.metadata
  });

  recordOperationalMetric({
    name: "risk.signal.detected",
    value: 1,
    unit: "count",
    correlationId: input.correlationId,
    aggregateId: input.aggregateId,
    source: input.source,
    metadata: {
      signalType: input.signalType,
      severity: input.severity
    }
  });

  writeOperationalLog({
    severity:
      input.severity === "CRITICAL"
        ? "ERROR"
        : input.severity === "HIGH"
          ? "WARN"
          : "INFO",
    event: "risk.signal_detected",
    message: `Risk signal detected: ${input.signalType}`,
    correlationId: input.correlationId,
    aggregateId: input.aggregateId,
    source: input.source,
    metadata: {
      signalType: input.signalType,
      severity: input.severity,
      actorUserId: input.actorUserId
    }
  });

  return event;
}
