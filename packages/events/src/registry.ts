import { RENDER_EVENT_TYPES, type RenderEventSource, type RenderEventType } from "./types.js";

export type RenderEventRegistryEntry = {
  type: RenderEventType;
  version: number;
  source: RenderEventSource;
  aggregate: "audit_log" | "webhook_event" | "queue_job" | "safe_deal" | "dispute" | "settlement";
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
  }
];

export function findRenderEventRegistryEntry(
  type: RenderEventType
): RenderEventRegistryEntry | undefined {
  return RENDER_EVENT_REGISTRY.find((entry) => entry.type === type);
}
