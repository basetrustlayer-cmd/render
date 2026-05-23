import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, requireAuthUser } from "../auth/middleware.js";
import { prisma } from "../database/client.js";
import { writeAuditLog } from "../audit/log.js";
import { createRenderQueue, RENDER_QUEUE_NAMES, type PushNotificationDeliveryJobData } from "@render/queue";
import { createRenderEvent, RENDER_EVENT_TYPES } from "@render/events";
import { recordOperationalMetric } from "@render/observability";

const emailNotificationSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(5000)
});

const smsNotificationSchema = z.object({
  to: z.string().min(8).max(20),
  body: z.string().min(1).max(1000)
});

const pushNotificationSchema = z.object({
  userId: z.string().uuid(),
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(1000)
});


const notificationPreferenceSchema = z.object({
  email: z.boolean(),
  sms: z.boolean(),
  push: z.boolean(),
  marketing: z.boolean(),
  transactional: z.boolean()
});


export async function registerNotificationRoutes(app: FastifyInstance): Promise<void> {
  app.get("/notification-preferences", { preHandler: authenticate }, async (request) => {
    const authUser = requireAuthUser(request);

    const preferences = await prisma.notificationPreference.upsert({
      where: { userId: authUser.userId },
      update: {},
      create: { userId: authUser.userId },
      select: {
        email: true,
        sms: true,
        push: true,
        marketing: true,
        transactional: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return { preferences };
  });

  app.put("/notification-preferences", { preHandler: authenticate }, async (request, reply) => {
    const authUser = requireAuthUser(request);
    const parsed = notificationPreferenceSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid notification preference payload." });
    }

    const preferences = await prisma.notificationPreference.upsert({
      where: { userId: authUser.userId },
      update: parsed.data,
      create: {
        userId: authUser.userId,
        ...parsed.data
      },
      select: {
        email: true,
        sms: true,
        push: true,
        marketing: true,
        transactional: true,
        createdAt: true,
        updatedAt: true
      }
    });

    void writeAuditLog({
      request,
      actorUserId: authUser.userId,
      action: "NOTIFICATION_PREFERENCES_UPDATED",
      entityType: "USER",
      entityId: authUser.userId,
      metadata: { updatedFields: Object.keys(parsed.data) }
    });

    return { preferences };
  });

  app.get("/notifications/health", async () => {
    return {
      status: "ok",
      providers: {
        email: Boolean(process.env.RESEND_API_KEY),
        sms: Boolean(process.env.HUBTEL_CLIENT_ID && process.env.HUBTEL_CLIENT_SECRET),
        push: Boolean(process.env.FIREBASE_SERVER_KEY)
      }
    };
  });

  app.post("/notifications/email", async (request, reply) => {
    const parsed = emailNotificationSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid email notification payload." });
    }

    return reply.code(501).send({
      error: "Email provider integration pending.",
      notification: parsed.data
    });
  });

  app.post("/notifications/sms", async (request, reply) => {
    const parsed = smsNotificationSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid SMS notification payload." });
    }

    return reply.code(501).send({
      error: "Hubtel SMS integration pending.",
      notification: parsed.data
    });
  });

  app.post("/notifications/push", async (request, reply) => {
    const parsed = pushNotificationSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid push notification payload." });
    }

    const queue = createRenderQueue(RENDER_QUEUE_NAMES.pushNotificationDelivery);
    const data: PushNotificationDeliveryJobData = {
      userId: parsed.data.userId,
      title: parsed.data.title,
      body: parsed.data.body,
      triggeredAt: new Date().toISOString(),
      correlationId: randomUUID()
    };

    const job = await queue.add("push-notification-delivery", data);
    await queue.close();

    const notificationDeliveryQueuedEvent = createRenderEvent({
      id: randomUUID(),
      type: RENDER_EVENT_TYPES.notificationDeliveryQueued,
      aggregateId: parsed.data.userId,
      correlationId: data.correlationId,
      source: "render.api",
      payload: {
        userId: parsed.data.userId,
        queue: RENDER_QUEUE_NAMES.pushNotificationDelivery,
        jobId: String(job.id ?? ""),
        channel: "push",
        status: "QUEUED"
      }
    });

    recordOperationalMetric({
      name: "notification.delivery.queued",
      value: 1,
      unit: "count",
      correlationId: data.correlationId,
      aggregateId: parsed.data.userId,
      source: "render.api",
      metadata: {
        queue: RENDER_QUEUE_NAMES.pushNotificationDelivery,
        jobId: String(job.id ?? ""),
        channel: "push"
      }
    });

    void writeAuditLog({
      request,
      actorUserId: parsed.data.userId,
      action: "PUSH_NOTIFICATION_DELIVERY_ENQUEUED",
      entityType: "USER",
      entityId: parsed.data.userId,
      metadata: {
        queue: RENDER_QUEUE_NAMES.pushNotificationDelivery,
        jobId: String(job.id ?? ""),
        correlationId: data.correlationId,
        event: JSON.parse(JSON.stringify(notificationDeliveryQueuedEvent))
      }
    });

    return reply.code(202).send({
      queued: true,
      queue: RENDER_QUEUE_NAMES.pushNotificationDelivery,
      jobId: job.id,
      correlationId: data.correlationId
    });
  });
}
