import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("messaging event emission contract", () => {
  const routeSource = readFileSync(resolve(process.cwd(), "src/messaging/routes.ts"), "utf8");
  const eventTypes = readFileSync(resolve(process.cwd(), "../../packages/events/src/types.ts"), "utf8");
  const registry = readFileSync(resolve(process.cwd(), "../../packages/events/src/registry.ts"), "utf8");

  it("defines messaging event types", () => {
    expect(eventTypes).toContain('conversationCreated: "render.messaging.conversation_created"');
    expect(eventTypes).toContain('messageSent: "render.messaging.message_sent"');
    expect(eventTypes).toContain('messageRead: "render.messaging.message_read"');
  });

  it("registers messaging events in the canonical event registry", () => {
    expect(registry).toContain("RENDER_EVENT_TYPES.conversationCreated");
    expect(registry).toContain("RENDER_EVENT_TYPES.messageSent");
    expect(registry).toContain("RENDER_EVENT_TYPES.messageRead");
    expect(registry).toContain('aggregate: "conversation"');
    expect(registry).toContain('aggregate: "message"');
    expect(registry).toContain("future notification fanout");
    expect(registry).toContain("future realtime gateway");
  });

  it("creates Render event envelopes in messaging routes", () => {
    expect(routeSource).toContain("createRenderEvent");
    expect(routeSource).toContain("RENDER_EVENT_TYPES.conversationCreated");
    expect(routeSource).toContain("RENDER_EVENT_TYPES.messageSent");
    expect(routeSource).toContain("RENDER_EVENT_TYPES.messageRead");
    expect(routeSource).toContain("correlationId: request.id");
    expect(routeSource).toContain('source: "render.api"');
  });

  it("stores messaging events as audit metadata and queues message fanout safely", () => {
    expect(routeSource).toContain("metadata: JSON.parse(JSON.stringify(conversationCreatedEvent))");
    expect(routeSource).toContain("metadata: JSON.parse(JSON.stringify(messageSentEvent))");
    expect(routeSource).toContain("metadata: JSON.parse(JSON.stringify(messageReadEvent))");
    expect(routeSource).toContain("enqueueMessagingNotificationFanout");
    expect(routeSource).toContain("RENDER_QUEUE_NAMES.messagingNotificationFanout");
    expect(routeSource).toContain("MESSAGING_NOTIFICATION_FANOUT_ENQUEUED");
    expect(routeSource).toContain("MESSAGING_NOTIFICATION_FANOUT_SKIPPED");
    expect(routeSource).toContain("QUEUE_UNAVAILABLE");
  });

  it("keeps TrustLayer authority out of messaging events", () => {
    expect(routeSource).not.toContain("createTrustLayerClient");
    expect(routeSource).not.toContain("trustScore");
    expect(routeSource).not.toContain("escrow");
    expect(routeSource).not.toContain("settlement");
  });
});
