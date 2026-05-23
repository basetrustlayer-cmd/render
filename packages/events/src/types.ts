export type RenderEventSource =
  | "render.api"
  | "render.worker"
  | "render.web"
  | "trustlayer"
  | "paystack.transitional";

export type RenderEventEnvelope<TPayload = Record<string, unknown>> = {
  id: string;
  type: string;
  version: number;
  aggregateId: string;
  correlationId: string;
  causationId?: string;
  source: RenderEventSource;
  payload: TPayload;
  metadata?: Record<string, unknown>;
  occurredAt: string;
};

export const RENDER_EVENT_VERSION = 1;

export const RENDER_EVENT_TYPES = {
  auditLogWritten: "render.audit.log_written",
  webhookReceived: "render.webhook.received",
  webhookProcessed: "render.webhook.processed",
  queueJobQueued: "render.queue.job_queued",
  queueJobProcessed: "render.queue.job_processed",
  safeDealProjectionSynced: "render.safedeal.projection_synced",
  disputeProjectionUpdated: "render.dispute.projection_updated",
  settlementReadyProjected: "render.settlement.ready_projected"
} as const;

export type RenderEventType =
  (typeof RENDER_EVENT_TYPES)[keyof typeof RENDER_EVENT_TYPES];
