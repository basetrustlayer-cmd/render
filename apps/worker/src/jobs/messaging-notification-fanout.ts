import { Worker } from "bullmq";
import {
  createQueueConnection,
  createRenderQueue,
  RENDER_QUEUE_NAMES,
  type MessagingNotificationFanoutJobData,
  type PushNotificationDeliveryJobData
} from "@render/queue";
import { recordOperationalMetric, writeOperationalLog } from "@render/observability";

const connection = createQueueConnection();

export const messagingNotificationFanoutWorker =
  new Worker<MessagingNotificationFanoutJobData>(
    RENDER_QUEUE_NAMES.messagingNotificationFanout,
    async (job) => {
      writeOperationalLog({
        severity: "INFO",
        event: "messaging.notification_fanout.started",
        message: "Messaging notification fanout worker accepted a job.",
        correlationId: job.data.correlationId,
        aggregateId: job.data.conversationId,
        source: "render.worker",
        metadata: {
          jobId: job.id,
          eventId: job.data.eventId,
          eventType: job.data.eventType,
          messageId: job.data.messageId,
          senderId: job.data.senderId,
          recipientUserIds: job.data.recipientUserIds,
          organizationId: job.data.organizationId,
          deliveryStatus: "PROVIDER_DELIVERY_PENDING"
        }
      });
    const deliveryQueue = createRenderQueue(RENDER_QUEUE_NAMES.pushNotificationDelivery);

    const deliveryJobs = await Promise.all(
      job.data.recipientUserIds.map((userId) => {
        const data: PushNotificationDeliveryJobData = {
          userId,
          title: "Render message update",
          body: "You have a marketplace messaging update.",
          triggeredAt: new Date().toISOString(),
          correlationId: job.data.correlationId
        };

        return deliveryQueue.add("push-notification-delivery", data, {
          jobId: `messaging-fanout:${job.data.eventId}:${userId}`
        });
      })
    );

    await deliveryQueue.close();

    recordOperationalMetric({
      name: "messaging.notification_fanout.delivery_queued",
      value: deliveryJobs.length,
      unit: "count",
      correlationId: job.data.correlationId,
      aggregateId: job.data.conversationId,
      source: "render.worker",
      metadata: {
        eventId: job.data.eventId,
        eventType: job.data.eventType,
        queue: RENDER_QUEUE_NAMES.pushNotificationDelivery,
        recipientCount: job.data.recipientUserIds.length
      }
    });

    return {
      ok: true,
      fanoutQueued: true,
      eventId: job.data.eventId,
      eventType: job.data.eventType,
      conversationId: job.data.conversationId,
      recipientCount: job.data.recipientUserIds.length,
      deliveryJobIds: deliveryJobs.map((deliveryJob) => String(deliveryJob.id ?? "")),
      processedAt: new Date().toISOString()
    };
    },
    { connection }
  );

messagingNotificationFanoutWorker.on("completed", (job) => {
  console.log(
    JSON.stringify({
      event: "messaging_notification_fanout_completed",
      jobId: job.id,
      eventId: job.data.eventId,
      conversationId: job.data.conversationId
    })
  );
});

messagingNotificationFanoutWorker.on("failed", (job, error) => {
  console.error(
    JSON.stringify({
      event: "messaging_notification_fanout_failed",
      jobId: job?.id,
      eventId: job?.data.eventId,
      error: error.message
    })
  );
});
