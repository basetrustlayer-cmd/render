import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "../auth/middleware.js";

const createConversationSchema = z.object({
  buyerId: z.string().uuid(),
  sellerId: z.string().uuid(),
  listingId: z.string().uuid().optional()
});

const sendMessageSchema = z.object({
  conversationId: z.string().uuid(),
  senderId: z.string().uuid(),
  body: z.string().min(1).max(2000)
});

export async function registerMessagingRoutes(app: FastifyInstance): Promise<void> {
  app.post("/conversations", { preHandler: authenticate }, async (request, reply) => {
    const parsed = createConversationSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid conversation payload." });
    }

    return reply.code(501).send({
      error: "Messaging persistence is pending Prisma client generation in CI/Render.",
      conversation: parsed.data
    });
  });

  app.get("/conversations/:id/messages", async (request, reply) => {
    const params = z.object({
      id: z.string().uuid()
    }).safeParse(request.params);

    if (!params.success) {
      return reply.code(400).send({ error: "Invalid conversation ID." });
    }

    return {
      messages: [],
      conversationId: params.data.id
    };
  });

  app.post("/messages", { preHandler: authenticate }, async (request, reply) => {
    const parsed = sendMessageSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid message payload." });
    }

    return reply.code(501).send({
      error: "Message persistence is pending Prisma client generation in CI/Render.",
      message: parsed.data
    });
  });
}
