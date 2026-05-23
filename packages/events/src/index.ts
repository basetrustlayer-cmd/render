export {
  RENDER_EVENT_TYPES,
  RENDER_EVENT_VERSION,
  type RenderEventEnvelope,
  type RenderEventSource,
  type RenderEventType
} from "./types.js";

import {
  RENDER_EVENT_VERSION,
  type RenderEventEnvelope,
  type RenderEventSource,
  type RenderEventType
} from "./types.js";

export function createRenderEvent<TPayload extends Record<string, unknown>>(input: {
  id: string;
  type: RenderEventType | string;
  aggregateId: string;
  correlationId: string;
  causationId?: string;
  source: RenderEventSource;
  payload: TPayload;
  metadata?: Record<string, unknown>;
  occurredAt?: string;
  version?: number;
}): RenderEventEnvelope<TPayload> {
  return {
    id: input.id,
    type: input.type,
    version: input.version ?? RENDER_EVENT_VERSION,
    aggregateId: input.aggregateId,
    correlationId: input.correlationId,
    causationId: input.causationId,
    source: input.source,
    payload: input.payload,
    metadata: input.metadata,
    occurredAt: input.occurredAt ?? new Date().toISOString()
  };
}

export {
  RENDER_EVENT_REGISTRY,
  findRenderEventRegistryEntry,
  type RenderEventRegistryEntry
} from "./registry.js";
