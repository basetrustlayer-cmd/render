import crypto from "node:crypto";
import { Worker } from "bullmq";
import {
  createQueueConnection,
  RENDER_QUEUE_NAMES,
  type NotificationDeadLetterJobData
} from "@render/queue";
import { recordOperationalMetric, writeOperationalLog } from "@render/observability";
import { createRenderEvent, RENDER_EVENT_TYPES } from "@render/events";

const connection = createQueueConnection();

export const notificationDeadLetterWorker = new Worker<NotificationDeadLetterJobData>(
  RENDER_QUEUE_NAMES.notificationDeadLetter,
  async (job) => {
    const processedEvent = createRenderEvent({
      id: crypto.randomUUID(),
      type: RENDER_EVENT_TYPES.notificationDeadLetterProcessed,
      aggregateId: job.data.userId,
      correlationId: job.data.correlationId,
      source: "render.worker",
      payload: {
        userId: job.data.userId,
        channel: "push",
        status: "DEAD_LETTER_PROCESSED",
        originalQueue: job.data.originalQueue,
        failedJobId: job.data.failedJobId,
        deadLetterJobId: String(job.id ?? ""),
        attemptsMade: job.data.attemptsMade
      }
    });

    const replayReadyEvent = createRenderEvent({
      id: crypto.randomUUID(),
      type: RENDER_EVENT_TYPES.notificationDeadLetterReplayReady,
      aggregateId: job.data.userId,
      correlationId: job.data.correlationId,
      causationId: processedEvent.id,
      source: "render.worker",
      payload: {
        userId: job.data.userId,
        channel: "push",
        status: "REPLAY_READY",
        originalQueue: job.data.originalQueue,
        failedJobId: job.data.failedJobId,
        deadLetterJobId: String(job.id ?? ""),
        replayMode: "MANUAL_OPERATOR_REVIEW_REQUIRED"
      }
    });

    writeOperationalLog({
      severity: "WARN",
      event: "notification.dead_letter.processed",
      message: "Notification dead-letter job processed and marked replay-ready.",
      correlationId: job.data.correlationId,
      aggregateId: job.data.userId,
      source: "render.worker",
      metadata: {
        deadLetterJobId: String(job.id ?? ""),
        failedJobId: job.data.failedJobId,
        originalQueue: job.data.originalQueue,
        attemptsMade: job.data.attemptsMade,
        error: job.data.error,
        processedEvent,
        replayReadyEvent
      }
    });

    recordOperationalMetric({
      name: "notification.dead_letter.processed",
      value: 1,
      unit: "count",
      correlationId: job.data.correlationId,
      aggregateId: job.data.userId,
      source: "render.worker",
      metadata: {
        deadLetterJobId: String(job.id ?? ""),
        originalQueue: job.data.originalQueue
      }
    });

    recordOperationalMetric({
      name: "notification.dead_letter.replayed_pending",
      value: 1,
      unit: "count",
      correlationId: job.data.correlationId,
      aggregateId: job.data.userId,
      source: "render.worker",
      metadata: {
        deadLetterJobId: String(job.id ?? ""),
        replayMode: "MANUAL_OPERATOR_REVIEW_REQUIRED"
      }
    });

    return {
      ok: true,
      replayReady: true,
      replayMode: "MANUAL_OPERATOR_REVIEW_REQUIRED",
      userId: job.data.userId,
      processedAt: new Date().toISOString()
    };
  },
  { connection }
);

notificationDeadLetterWorker.on("completed", (job) => {
  console.log(JSON.stringify({
    event: "notification_dead_letter_completed",
    jobId: job.id,
    userId: job.data.userId
  }));
});

notificationDeadLetterWorker.on("failed", (job, error) => {
  console.error(JSON.stringify({
    event: "notification_dead_letter_failed",
    jobId: job?.id,
    userId: job?.data.userId,
    error: error.message
  }));
});
