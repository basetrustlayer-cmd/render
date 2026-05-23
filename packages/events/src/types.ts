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
  settlementReadyProjected: "render.settlement.ready_projected",
  conversationCreated: "render.messaging.conversation_created",
  messageSent: "render.messaging.message_sent",
  messageRead: "render.messaging.message_read",
  notificationDeliveryQueued: "render.notification.delivery_queued",
  notificationDeliveryStarted: "render.notification.delivery_started",
  notificationDeliveryDeferred: "render.notification.delivery_deferred",
  notificationDeliveryFailed: "render.notification.delivery_failed",
  notificationDeliveryRetryExhausted: "render.notification.delivery_retry_exhausted",
  notificationDeadLetterQueued: "render.notification.dead_letter_queued",
  notificationDeadLetterProcessed: "render.notification.dead_letter_processed",
  notificationDeadLetterReplayReady: "render.notification.dead_letter_replay_ready",
  notificationReplayRequested: "render.notification.replay_requested",
  notificationReplayBlocked: "render.notification.replay_blocked",
  notificationReplayStarted: "render.notification.replay_started",
  notificationReplayDeliveryEnqueued: "render.notification.replay_delivery_enqueued"
} as const;

export type RenderEventType =
  (typeof RENDER_EVENT_TYPES)[keyof typeof RENDER_EVENT_TYPES];
