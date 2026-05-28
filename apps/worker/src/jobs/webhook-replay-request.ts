import { Worker } from "bullmq";
import {
  createQueueConnection,
  RENDER_QUEUE_NAMES,
  type WebhookReplayRequestJobData
} from "@render/queue";
import { getOperationalSloBreachMetadata, recordOperationalMetric, writeOperationalLog } from "@render/observability";

const connection = createQueueConnection();

export const webhookReplayRequestWorker = new Worker<WebhookReplayRequestJobData>(
  RENDER_QUEUE_NAMES.webhookReplayRequest,
  async (job) => {
    const manualApproval = true;
    const automaticReplay = false;
    const replayMode = "MANUAL_OPERATOR_REVIEW_REQUIRED";

    writeOperationalLog({
      severity: "INFO",
      event: "webhook.replay.review_recorded",
      message: "Webhook replay request recorded for manual operator review only.",
      correlationId: job.data.correlationId,
      aggregateId: job.data.eventId,
      source: "render.worker",
      metadata: {
        webhookEventId: job.data.webhookEventId,
        provider: job.data.provider,
        eventId: job.data.eventId,
        eventType: job.data.eventType,
        requestedByUserId: job.data.requestedByUserId,
        manualApproval,
        automaticReplay,
        replayMode,
        ...getOperationalSloBreachMetadata({
          name: "webhook.replay.requested",
          value: 1
        })
      }
    });

    recordOperationalMetric({
      name: "notification.replay.requested",
      value: 1,
      unit: "count",
      correlationId: job.data.correlationId,
      aggregateId: job.data.eventId,
      source: "render.worker",
      metadata: {
        provider: job.data.provider,
        eventType: job.data.eventType,
        webhookEventId: job.data.webhookEventId,
        manualApproval,
        automaticReplay,
        replayMode,
        ...getOperationalSloBreachMetadata({
          name: "webhook.replay.requested",
          value: 1
        })
      }
    });

    return {
      ok: true,
      replayQueued: false,
      manualApproval,
      automaticReplay,
      replayMode,
      processedAt: new Date().toISOString()
    };
  },
  { connection }
);

webhookReplayRequestWorker.on("completed", (job) => {
  console.log(JSON.stringify({
    event: "webhook_replay_request_completed",
    jobId: job.id,
    webhookEventId: job.data.webhookEventId
  }));
});

webhookReplayRequestWorker.on("failed", (job, error) => {
  console.error(JSON.stringify({
    event: "webhook_replay_request_failed",
    jobId: job?.id,
    webhookEventId: job?.data.webhookEventId,
    error: error.message
  }));
});
