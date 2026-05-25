import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("webhook replay queue contract", () => {
  const queue = readFileSync(resolve(process.cwd(), "../../packages/queue/src/index.ts"), "utf8");

  it("defines a dedicated manual webhook replay queue contract", () => {
    expect(queue).toContain('webhookReplayRequest: "render.webhook.replay_request"');
    expect(queue).toContain("WebhookReplayRequestJobData");
    expect(queue).toContain("webhookEventId: string");
    expect(queue).toContain('provider: "TRUSTLAYER"');
    expect(queue).toContain("manualApproval: true");
    expect(queue).toContain("automaticReplay: false");
    expect(queue).toContain('replayMode: "MANUAL_OPERATOR_REVIEW_REQUIRED"');
    expect(queue).toContain("[RENDER_QUEUE_NAMES.webhookReplayRequest]: WebhookReplayRequestJobData");
  });
});
