import type { FastifyInstance } from "fastify";
import { z } from "zod";

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

export async function registerNotificationRoutes(app: FastifyInstance): Promise<void> {
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

    return reply.code(501).send({
      error: "Push notification integration pending.",
      notification: parsed.data
    });
  });
}
