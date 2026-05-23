import crypto from "node:crypto";
import { Worker } from "bullmq";
import {
  createQueueConnection,
  createRenderQueue,
  RENDER_QUEUE_NAMES,
  type NotificationReplayRequestJobData,
  type PushNotificationDeliveryJobData
} from "@render/queue";
import { recordOperationalMetric, writeOperationalLog } from "@render/observability";
import { createRenderEvent, RENDER_EVENT_TYPES } from "@render/events";

const connection = createQueueConnection();

export const notificationReplayRequestWorker = new Worker<NotificationReplayRequestJobData>(
  RENDER_QUEUE_NAMES.notificationReplayRequest,
  async (job) => {
    const manualApproval = true;
    const automaticReplay = false;
    const replayMode = "MANUAL_OPERATOR_REVIEW_REQUIRED";

    const startedEvent = createRenderEvent({
      id: crypto.randomUUID(),
      type: RENDER_EVENT_TYPES.notificationReplayStarted,
      aggregateId: job.data.userId,
      correlationId: job.data.correlationId,
      source: "render.worker",
      payload: {
        userId: job.data.userId,
        deadLetterJobId: job.data.deadLetterJobId,
        replayRequestJobId: String(job.id ?? ""),
        status: "REPLAY_GOVERNANCE_STARTED",
        manualApproval,
        automaticReplay,
        replayMode
      }
    });

    const deliveryData: PushNotificationDeliveryJobData = {
      userId: job.data.userId,
      title: job.data.title,
      body: job.data.body,
      triggeredAt: new Date().toISOString(),
      correlationId: job.data.correlationId
    };

    const deliveryQueue = createRenderQueue(RENDER_QUEUE_NAMES.pushNotificationDelivery);
    const deliveryJob = await deliveryQueue.add("push-notification-delivery", deliveryData, {
      jobId: `notification-replay-delivery:${job.data.deadLetterJobId}:${job.data.approvedByUserId}`
    });
    await deliveryQueue.close();

    const enqueuedEvent = createRenderEvent({
      id: crypto.randomUUID(),
      type: RENDER_EVENT_TYPES.notificationReplayDeliveryEnqueued,
      aggregateId: job.data.userId,
      correlationId: job.data.correlationId,
      causationId: startedEvent.id,
      source: "render.worker",
      payload: {
        userId: job.data.userId,
        deadLetterJobId: job.data.deadLetterJobId,
        replayRequestJobId: String(job.id ?? ""),
        deliveryJobId: String(deliveryJob.id ?? ""),
        status: "REPLAY_DELIVERY_ENQUEUED",
        manualApproval,
        automaticReplay,
        replayMode
      }
    });

    writeOperationalLog({
      severity: "INFO",
      event: "notification.replay.delivery_enqueued",
      message: "Notification replay request passed governance and re-enqueued delivery.",
      correlationId: job.data.correlationId,
      aggregateId: job.data.userId,
      source: "render.worker",
      metadata: {
        startedEvent,
        enqueuedEvent,
        deadLetterJobId: job.data.deadLetterJobId,
        replayRequestJobId: String(job.id ?? ""),
        deliveryJobId: String(deliveryJob.id ?? ""),
        approvedByUserId: job.data.approvedByUserId,
        replayMode
      }
    });

    recordOperationalMetric({
      name: "notification.replay.delivery_enqueued",
      value: 1,
      unit: "count",
      correlationId: job.data.correlationId,
      aggregateId: job.data.userId,
      source: "render.worker",
      metadata: {
        deadLetterJobId: job.data.deadLetterJobId,
        replayRequestJobId: String(job.id ?? ""),
        deliveryJobId: String(deliveryJob.id ?? ""),
        manualApproval,
        automaticReplay
      }
    });

    return {
      ok: true,
      replayDeliveryEnqueued: true,
      deliveryJobId: String(deliveryJob.id ?? ""),
      replayMode,
      processedAt: new Date().toISOString()
    };
  },
  { connection }
);

notificationReplayRequestWorker.on("completed", (job) => {
  console.log(JSON.stringify({
    event: "notification_replay_request_completed",
    jobId: job.id,
    userId: job.data.userId
  }));
});

notificationReplayRequestWorker.on("failed", (job, error) => {
  console.error(JSON.stringify({
    event: "notification_replay_request_failed",
    jobId: job?.id,
    userId: job?.data.userId,
    error: error.message
  }));
});
