import { Worker } from "bullmq";
import {
  createQueueConnection,
  RENDER_QUEUE_NAMES,
  type PushNotificationDeliveryJobData
} from "@render/queue";
import { writeOperationalLog } from "@render/observability";

const connection = createQueueConnection();

export const pushNotificationDeliveryWorker =
  new Worker<PushNotificationDeliveryJobData>(
    RENDER_QUEUE_NAMES.pushNotificationDelivery,
    async (job) => {
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
          deliveryStatus: "PROVIDER_DELIVERY_PENDING"
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
  console.error(JSON.stringify({
    event: "push_notification_delivery_failed",
    jobId: job?.id,
    userId: job?.data.userId,
    error: error.message
  }));
});
