import { Worker } from "bullmq";
import {
  createQueueConnection,
  RENDER_QUEUE_NAMES,
  type MessagingNotificationFanoutJobData
} from "@render/queue";
import { writeOperationalLog } from "@render/observability";

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

      return {
        ok: true,
        fanoutDeferred: true,
        reason: "Provider delivery integration pending.",
        eventId: job.data.eventId,
        eventType: job.data.eventType,
        conversationId: job.data.conversationId,
        recipientCount: job.data.recipientUserIds.length,
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
