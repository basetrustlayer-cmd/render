import crypto from "node:crypto";
import { Worker } from "bullmq";
import {
  createQueueConnection,
  createRenderQueue,
  RENDER_QUEUE_NAMES,
  type NotificationDeadLetterJobData,
  type PushNotificationDeliveryJobData
} from "@render/queue";
import { elapsedMs, nowMs, recordOperationalMetric, writeOperationalLog } from "@render/observability";
import { createRenderEvent, RENDER_EVENT_TYPES } from "@render/events";

const connection = createQueueConnection();
const MAX_PUSH_NOTIFICATION_ATTEMPTS = 3;

export const pushNotificationDeliveryWorker =
  new Worker<PushNotificationDeliveryJobData>(
    RENDER_QUEUE_NAMES.pushNotificationDelivery,
    async (job) => {
      const startedAt = nowMs();

      const notificationDeliveryStartedEvent = createRenderEvent({
        id: crypto.randomUUID(),
        type: RENDER_EVENT_TYPES.notificationDeliveryStarted,
        aggregateId: job.data.userId,
        correlationId: job.data.correlationId,
        source: "render.worker",
        payload: {
          userId: job.data.userId,
          channel: "push",
          status: "STARTED",
          jobId: String(job.id ?? "")
        }
      });

      const notificationDeliveryDeferredEvent = createRenderEvent({
        id: crypto.randomUUID(),
        type: RENDER_EVENT_TYPES.notificationDeliveryDeferred,
        aggregateId: job.data.userId,
        correlationId: job.data.correlationId,
        causationId: notificationDeliveryStartedEvent.id,
        source: "render.worker",
        payload: {
          userId: job.data.userId,
          channel: "push",
          status: "PROVIDER_DELIVERY_PENDING",
          jobId: String(job.id ?? "")
        }
      });

      recordOperationalMetric({
        name: "notification.delivery.started",
        value: 1,
        unit: "count",
        correlationId: job.data.correlationId,
        aggregateId: job.data.userId,
        source: "render.worker",
        metadata: {
          queue: RENDER_QUEUE_NAMES.pushNotificationDelivery,
          jobId: String(job.id ?? ""),
          channel: "push"
        }
      });

      writeOperationalLog({
        severity: "INFO",
        event: "notification.push_delivery.started",
        message: "Push notification delivery worker accepted a job.",
        correlationId: job.data.correlationId,
        aggregateId: job.data.userId,
        source: "render.worker",
        metadata: {
          jobId: job.id,
          userId: job.data.userId,
          deliveryStatus: "PROVIDER_DELIVERY_PENDING",
          startedEvent: notificationDeliveryStartedEvent,
          deferredEvent: notificationDeliveryDeferredEvent
        }
      });

      recordOperationalMetric({
        name: "notification.delivery.deferred",
        value: 1,
        unit: "count",
        correlationId: job.data.correlationId,
        aggregateId: job.data.userId,
        source: "render.worker",
        metadata: {
          queue: RENDER_QUEUE_NAMES.pushNotificationDelivery,
          jobId: String(job.id ?? ""),
          channel: "push",
          reason: "provider_integration_pending"
        }
      });

      recordOperationalMetric({
        name: "notification.delivery.duration_ms",
        value: elapsedMs(startedAt),
        unit: "ms",
        correlationId: job.data.correlationId,
        aggregateId: job.data.userId,
        source: "render.worker",
        metadata: {
          queue: RENDER_QUEUE_NAMES.pushNotificationDelivery,
          jobId: String(job.id ?? ""),
          channel: "push",
          status: "DEFERRED"
        }
      });

      return {
        ok: true,
        providerDeliveryDeferred: true,
        reason: "Push provider integration pending.",
        userId: job.data.userId,
        processedAt: new Date().toISOString()
      };
    },
    { connection }
  );

pushNotificationDeliveryWorker.on("completed", (job) => {
  console.log(JSON.stringify({
    event: "push_notification_delivery_completed",
    jobId: job.id,
    userId: job.data.userId
  }));
});

pushNotificationDeliveryWorker.on("failed", async (job, error) => {
  if (job) {
    const attemptsMade = job.attemptsMade;
    const retryExhausted = attemptsMade >= MAX_PUSH_NOTIFICATION_ATTEMPTS;

    recordOperationalMetric({
      name: "notification.delivery.failed",
      value: 1,
      unit: "count",
      correlationId: job.data.correlationId,
      aggregateId: job.data.userId,
      source: "render.worker",
      metadata: {
        queue: RENDER_QUEUE_NAMES.pushNotificationDelivery,
        jobId: String(job.id ?? ""),
        channel: "push",
        attemptsMade,
        retryExhausted,
        error: error.message
      }
    });

    if (retryExhausted) {
      const retryExhaustedEvent = createRenderEvent({
        id: crypto.randomUUID(),
        type: RENDER_EVENT_TYPES.notificationDeliveryRetryExhausted,
        aggregateId: job.data.userId,
        correlationId: job.data.correlationId,
        source: "render.worker",
        payload: {
          userId: job.data.userId,
          channel: "push",
          status: "RETRY_EXHAUSTED",
          jobId: String(job.id ?? ""),
          attemptsMade,
          error: error.message
        }
      });

      const deadLetterData: NotificationDeadLetterJobData = {
        originalQueue: RENDER_QUEUE_NAMES.pushNotificationDelivery,
        failedJobId: String(job.id ?? ""),
        userId: job.data.userId,
        title: job.data.title,
        body: job.data.body,
        attemptsMade,
        failedAt: new Date().toISOString(),
        error: error.message,
        correlationId: job.data.correlationId
      };

      const deadLetterQueue = createRenderQueue(RENDER_QUEUE_NAMES.notificationDeadLetter);
      const deadLetterJob = await deadLetterQueue.add("notification-dead-letter", deadLetterData);
      await deadLetterQueue.close();

      const deadLetterQueuedEvent = createRenderEvent({
        id: crypto.randomUUID(),
        type: RENDER_EVENT_TYPES.notificationDeadLetterQueued,
        aggregateId: job.data.userId,
        correlationId: job.data.correlationId,
        causationId: retryExhaustedEvent.id,
        source: "render.worker",
        payload: {
          userId: job.data.userId,
          channel: "push",
          status: "DEAD_LETTER_QUEUED",
          deadLetterJobId: String(deadLetterJob.id ?? ""),
          originalJobId: String(job.id ?? ""),
          attemptsMade
        }
      });

      recordOperationalMetric({
        name: "notification.delivery.retry_exhausted",
        value: 1,
        unit: "count",
        correlationId: job.data.correlationId,
        aggregateId: job.data.userId,
        source: "render.worker",
        metadata: { retryExhaustedEvent, attemptsMade }
      });

      recordOperationalMetric({
        name: "notification.dead_letter.queued",
        value: 1,
        unit: "count",
        correlationId: job.data.correlationId,
        aggregateId: job.data.userId,
        source: "render.worker",
        metadata: {
          deadLetterQueuedEvent,
          deadLetterJobId: String(deadLetterJob.id ?? ""),
          originalJobId: String(job.id ?? "")
        }
      });
    }
  }

  console.error(JSON.stringify({
    event: "push_notification_delivery_failed",
    jobId: job?.id,
    userId: job?.data.userId,
    error: error.message
  }));
});
