export type ReliabilitySeverity = "SEV0" | "SEV1" | "SEV2" | "SEV3";

export function createReliabilityIncident(input: {
  id: string;
  severity: ReliabilitySeverity;
  title: string;
  aggregateId: string;
  correlationId: string;
  source: "render.api" | "render.worker";
  metadata?: Record<string, unknown>;
}) {
  return {
    id: input.id,
    type: "render.reliability.incident.opened",
    version: 1,
    aggregateId: input.aggregateId,
    correlationId: input.correlationId,
    source: input.source,
    payload: {
      severity: input.severity,
      title: input.title
    },
    metadata: input.metadata,
    occurredAt: new Date().toISOString()
  };
}
