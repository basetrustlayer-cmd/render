import { Queue } from "bullmq";
import { Redis } from "ioredis";

export const RENDER_QUEUE_NAMES = {
  smoke: "render.smoke",
  settlementProcessing: "render.settlement.processing",
  messagingNotificationFanout: "render.messaging.notification_fanout"
} as const;

export type RenderQueueName =
  (typeof RENDER_QUEUE_NAMES)[keyof typeof RENDER_QUEUE_NAMES];

export type SmokeJobData = {
  requestedBy: "api" | "worker" | "cli";
  requestedAt: string;
  correlationId: string;
};

export type SettlementProcessingJobData = {
  safeDealId: string;
  settlementId: string;
  triggeredBy:
    | "buyer_confirmation"
    | "webhook"
    | "retry_worker";
  triggeredAt: string;
};

export type MessagingNotificationFanoutJobData = {
  eventId: string;
  eventType:
    | "render.messaging.conversation_created"
    | "render.messaging.message_sent"
    | "render.messaging.message_read";
  conversationId: string;
  messageId?: string;
  senderId?: string;
  recipientUserIds: string[];
  organizationId?: string | null;
  triggeredAt: string;
  correlationId: string;
};

export type RenderJobDataByQueue = {
  [RENDER_QUEUE_NAMES.smoke]: SmokeJobData;
  [RENDER_QUEUE_NAMES.settlementProcessing]: SettlementProcessingJobData;
  [RENDER_QUEUE_NAMES.messagingNotificationFanout]: MessagingNotificationFanoutJobData;
};

export function getRedisUrl(): string {
  const redisUrl = process.env.REDIS_URL?.trim();

  if (!redisUrl) {
    throw new Error("REDIS_URL is required for queue operations.");
  }

  return redisUrl;
}

export function createQueueConnection(): Redis {
  return new Redis(getRedisUrl(), {
    maxRetriesPerRequest: null
  });
}

export function createRenderQueue<TQueueName extends RenderQueueName>(
  queueName: TQueueName
): Queue<RenderJobDataByQueue[TQueueName]> {
  return new Queue<RenderJobDataByQueue[TQueueName]>(queueName, {
    connection: createQueueConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1000
      },
      removeOnComplete: {
        age: 60 * 60,
        count: 1000
      },
      removeOnFail: {
        age: 24 * 60 * 60,
        count: 1000
      }
    }
  });
}
