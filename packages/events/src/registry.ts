import { RENDER_EVENT_TYPES, type RenderEventSource, type RenderEventType } from "./types.js";

export type RenderEventRegistryEntry = {
  type: RenderEventType;
  version: number;
  source: RenderEventSource;
  aggregate: "audit_log" | "webhook_event" | "queue_job" | "safe_deal" | "dispute" | "settlement" | "conversation" | "message" | "notification_delivery";
  producer: string;
  consumers: string[];
  replaySafe: boolean;
  description: string;
};

export const RENDER_EVENT_REGISTRY: RenderEventRegistryEntry[] = [
  {
    type: RENDER_EVENT_TYPES.auditLogWritten,
    version: 1,
    source: "render.api",
    aggregate: "audit_log",
    producer: "apps/api/src/audit/log.ts",
    consumers: ["admin audit log views", "future observability pipeline"],
    replaySafe: true,
    description: "Audit log projection written for operational traceability."
  },
  {
    type: RENDER_EVENT_TYPES.webhookReceived,
    version: 1,
    source: "trustlayer",
    aggregate: "webhook_event",
    producer: "apps/api/src/webhooks/routes.ts",
    consumers: ["webhook idempotency guard", "projection sync"],
    replaySafe: true,
    description: "External TrustLayer webhook accepted after signature validation."
  },
  {
    type: RENDER_EVENT_TYPES.webhookProcessed,
    version: 1,
    source: "render.api",
    aggregate: "webhook_event",
    producer: "apps/api/src/webhooks/routes.ts",
    consumers: ["safe deal cache", "settlement readiness projection", "dispute projection"],
    replaySafe: true,
    description: "Webhook processed into Render-side projection state."
  },
  {
    type: RENDER_EVENT_TYPES.queueJobQueued,
    version: 1,
    source: "render.api",
    aggregate: "queue_job",
    producer: "apps/api/src/webhooks/routes.ts",
    consumers: ["apps/worker/src/jobs/settlement-processor.ts"],
    replaySafe: true,
    description: "Queue job created for asynchronous operational processing."
  },
  {
    type: RENDER_EVENT_TYPES.queueJobProcessed,
    version: 1,
    source: "render.worker",
    aggregate: "queue_job",
    producer: "apps/worker/src/jobs/settlement-processor.ts",
    consumers: ["logs", "future observability pipeline"],
    replaySafe: true,
    description: "Worker completed or skipped queue job processing."
  },
  {
    type: RENDER_EVENT_TYPES.safeDealProjectionSynced,
    version: 1,
    source: "render.api",
    aggregate: "safe_deal",
    producer: "apps/api/src/webhooks/routes.ts",
    consumers: ["marketplace SafeDeal views"],
    replaySafe: true,
    description: "TrustLayer escrow state synchronized into Render cached SafeDeal projection."
  },
  {
    type: RENDER_EVENT_TYPES.disputeProjectionUpdated,
    version: 1,
    source: "render.api",
    aggregate: "dispute",
    producer: "apps/api/src/safe-deals/routes.ts and apps/api/src/admin/routes.ts",
    consumers: ["admin dispute review views"],
    replaySafe: true,
    description: "Dispute projection event recorded for moderation workflow."
  },
  {
    type: RENDER_EVENT_TYPES.settlementReadyProjected,
    version: 1,
    source: "render.api",
    aggregate: "settlement",
    producer: "apps/api/src/webhooks/routes.ts",
    consumers: ["settlement worker", "finance reconciliation endpoint"],
    replaySafe: true,
    description: "Settlement readiness projected after TrustLayer confirmation webhook."
  },
  {
    type: RENDER_EVENT_TYPES.conversationCreated,
    version: 1,
    source: "render.api",
    aggregate: "conversation",
    producer: "apps/api/src/messaging/routes.ts",
    consumers: ["future notification fanout", "future realtime gateway", "future observability pipeline"],
    replaySafe: true,
    description: "Conversation created inside Render marketplace messaging."
  },
  {
    type: RENDER_EVENT_TYPES.messageSent,
    version: 1,
    source: "render.api",
    aggregate: "message",
    producer: "apps/api/src/messaging/routes.ts",
    consumers: ["future notification fanout", "future realtime gateway", "future moderation pipeline"],
    replaySafe: true,
    description: "Message sent inside a Render marketplace conversation."
  },
  {
    type: RENDER_EVENT_TYPES.messageRead,
    version: 1,
    source: "render.api",
    aggregate: "message",
    producer: "apps/api/src/messaging/routes.ts",
    consumers: ["future unread-count projection", "future realtime gateway"],
    replaySafe: true,
    description: "Message read receipt recorded inside Render marketplace messaging."

  },
  {
    type: RENDER_EVENT_TYPES.notificationDeliveryQueued,
    version: 1,
    source: "render.api",
    aggregate: "notification_delivery",
    producer: "apps/api/src/notifications/routes.ts",
    consumers: ["apps/worker/src/jobs/push-notification-delivery.ts", "future notification observability views"],
    replaySafe: true,
    description: "Push notification delivery job queued by Render API."
  },
  {
    type: RENDER_EVENT_TYPES.notificationDeliveryStarted,
    version: 1,
    source: "render.worker",
    aggregate: "notification_delivery",
    producer: "apps/worker/src/jobs/push-notification-delivery.ts",
    consumers: ["future notification observability views"],
    replaySafe: true,
    description: "Push notification delivery worker started processing a queued job."
  },
  {
    type: RENDER_EVENT_TYPES.notificationDeliveryDeferred,
    version: 1,
    source: "render.worker",
    aggregate: "notification_delivery",
    producer: "apps/worker/src/jobs/push-notification-delivery.ts",
    consumers: ["future Firebase adapter", "future notification observability views"],
    replaySafe: true,
    description: "Push notification provider delivery intentionally deferred while provider integration is pending."
  },
  {
    type: RENDER_EVENT_TYPES.notificationDeliveryFailed,
    version: 1,
    source: "render.worker",
    aggregate: "notification_delivery",
    producer: "apps/worker/src/jobs/push-notification-delivery.ts",
    consumers: ["future retry and dead-letter queue"],
    replaySafe: true,
    description: "Push notification delivery failed and needs retry or operator visibility."

  },
  {
    type: RENDER_EVENT_TYPES.notificationDeliveryRetryExhausted,
    version: 1,
    source: "render.worker",
    aggregate: "notification_delivery",
    producer: "apps/worker/src/jobs/push-notification-delivery.ts",
    consumers: ["dead-letter queue", "future notification observability views"],
    replaySafe: true,
    description: "Push notification delivery exhausted retry attempts."
  },
  {
    type: RENDER_EVENT_TYPES.notificationDeadLetterQueued,
    version: 1,
    source: "render.worker",
    aggregate: "notification_delivery",
    producer: "apps/worker/src/jobs/push-notification-delivery.ts",
    consumers: ["operator review", "future replay tooling"],
    replaySafe: true,
    description: "Failed push notification delivery was moved to the dead-letter queue."
  }
,
  {
    type: RENDER_EVENT_TYPES.notificationDeadLetterProcessed,
    version: 1,
    source: "render.worker",
    aggregate: "notification_delivery",
    producer: "apps/worker/src/jobs/notification-dead-letter.ts",
    consumers: ["operator review", "future replay tooling"],
    replaySafe: true,
    description: "Notification dead-letter worker processed a failed delivery artifact."
  },
  {
    type: RENDER_EVENT_TYPES.notificationDeadLetterReplayReady,
    version: 1,
    source: "render.worker",
    aggregate: "notification_delivery",
    producer: "apps/worker/src/jobs/notification-dead-letter.ts",
    consumers: ["future replay tooling", "future notification observability views"],
    replaySafe: true,
    description: "Notification dead-letter payload is preserved and ready for future controlled replay."
  } ,
  {
    type: RENDER_EVENT_TYPES.notificationReplayRequested,
    version: 1,
    source: "render.api",
    aggregate: "notification_delivery",
    producer: "apps/api/src/admin/routes.ts",
    consumers: ["manual replay worker", "future notification observability views"],
    replaySafe: true,
    description: "Super admin requested controlled replay of a preserved notification dead-letter payload."
  },
  {
    type: RENDER_EVENT_TYPES.notificationReplayBlocked,
    version: 1,
    source: "render.api",
    aggregate: "notification_delivery",
    producer: "apps/api/src/admin/routes.ts",
    consumers: ["operator review", "future security policy views"],
    replaySafe: true,
    description: "Notification dead-letter replay was blocked by manual policy controls."
  }
];

export function findRenderEventRegistryEntry(
  type: RenderEventType
): RenderEventRegistryEntry | undefined {
  return RENDER_EVENT_REGISTRY.find((entry) => entry.type === type);
}
