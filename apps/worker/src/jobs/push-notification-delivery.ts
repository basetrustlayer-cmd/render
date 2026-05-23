import crypto from "node:crypto";
import { Worker } from "bullmq";
import {
  createQueueConnection,
  RENDER_QUEUE_NAMES,
  type PushNotificationDeliveryJobData
} from "@render/queue";
import { elapsedMs, nowMs, recordOperationalMetric, writeOperationalLog } from "@render/observability";
import { createRenderEvent, RENDER_EVENT_TYPES } from "@render/events";

const connection = createQueueConnection();

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

pushNotificationDeliveryWorker.on("failed", (job, error) => {
  if (job) {
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
        error: error.message
      }
    });
  }

  console.error(JSON.stringify({
    event: "push_notification_delivery_failed",
    jobId: job?.id,
    userId: job?.data.userId,
    error: error.message
  }));
});
