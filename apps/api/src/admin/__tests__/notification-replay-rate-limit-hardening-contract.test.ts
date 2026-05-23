import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("notification replay rate limit hardening contract", () => {
  const source = readFileSync(resolve(process.cwd(), "src/admin/routes.ts"), "utf8");
  const eventTypes = readFileSync(resolve(process.cwd(), "../../packages/events/src/types.ts"), "utf8");
  const registry = readFileSync(resolve(process.cwd(), "../../packages/events/src/registry.ts"), "utf8");
  const observability = readFileSync(resolve(process.cwd(), "../../packages/observability/src/index.ts"), "utf8");

  it("rate limits replay requests before queue mutation", () => {
    expect(source).toContain("notificationReplayRateLimitWindowMs");
    expect(source).toContain("notificationReplayRateLimitHits");
    expect(source).toContain("rateLimitKey");
    expect(source).toContain("return reply.code(429).send");
  });

  it("emits replay rate-limited event and metric", () => {
    expect(eventTypes).toContain("notificationReplayRateLimited");
    expect(registry).toContain("RENDER_EVENT_TYPES.notificationReplayRateLimited");
    expect(observability).toContain('"notification.replay.rate_limited"');
    expect(source).toContain("notificationReplayRateLimited");
    expect(source).toContain('name: "notification.replay.rate_limited"');
  });

  it("persists rate-limit audit context", () => {
    expect(source).toContain('action: "NOTIFICATION_DEAD_LETTER_REPLAY_RATE_LIMITED"');
    expect(source).toContain("retryAfterSeconds");
    expect(source).toContain("rateLimitEvent");
  });
});
