import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("webhook replay worker governance contract", () => {
  const worker = readFileSync(resolve(process.cwd(), "../../apps/worker/src/jobs/webhook-replay-request.ts"), "utf8");
  const main = readFileSync(resolve(process.cwd(), "../../apps/worker/src/main.ts"), "utf8");

  it("registers a dedicated webhook replay request worker", () => {
    expect(worker).toContain("webhookReplayRequestWorker");
    expect(worker).toContain("RENDER_QUEUE_NAMES.webhookReplayRequest");
    expect(main).toContain("webhookReplayRequestWorker");
    expect(main).toContain("RENDER_QUEUE_NAMES.webhookReplayRequest");
    expect(main).toContain("await webhookReplayRequestWorker.close()");
  });

  it("keeps webhook replay governance-only with no automatic replay execution", () => {
    expect(worker).toContain("const manualApproval = true");
    expect(worker).toContain("const automaticReplay = false");
    expect(worker).toContain('replayMode = "MANUAL_OPERATOR_REVIEW_REQUIRED"');
    expect(worker).toContain("replayQueued: false");
    expect(worker).not.toContain("fetch(");
    expect(worker).not.toContain("app.inject");
    expect(worker).not.toContain("webhooks/trustlayer");
  });

  it("records operational evidence for manual webhook replay review", () => {
    expect(worker).toContain('event: "webhook.replay.review_recorded"');
    expect(worker).toContain('name: "notification.replay.requested"');
    expect(worker).toContain("webhookEventId: job.data.webhookEventId");
    expect(worker).toContain("requestedByUserId: job.data.requestedByUserId");
  });
});
