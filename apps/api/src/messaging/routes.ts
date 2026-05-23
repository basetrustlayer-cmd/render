import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, requireAuthUser } from "../auth/middleware.js";
import { prisma } from "../database/client.js";
import { writeAuditLog } from "../audit/log.js";

const createConversationSchema = z.object({
  buyerId: z.string().uuid(),
  sellerId: z.string().uuid(),
  listingId: z.string().uuid().optional()
});

const conversationParamsSchema = z.object({
  id: z.string().uuid()
});

const sendMessageSchema = z.object({
  conversationId: z.string().uuid(),
  senderId: z.string().uuid(),
  body: z.string().min(1).max(2000)
});

function isConversationParticipant(conversation: { buyerId: string; sellerId: string }, userId: string): boolean {
  return conversation.buyerId === userId || conversation.sellerId === userId;
}

export async function registerMessagingRoutes(app: FastifyInstance): Promise<void> {
  app.get("/conversations", { preHandler: authenticate }, async (request) => {
    const authUser = requireAuthUser(request);

    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [
          { buyerId: authUser.userId },
          { sellerId: authUser.userId }
        ]
      },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            price: true,
            status: true
          }
        },
        buyer: {
          select: {
            id: true,
            verificationLevel: true,
            trustTier: true,
            isBusiness: true
          }
        },
        seller: {
          select: {
            id: true,
            verificationLevel: true,
            trustTier: true,
            isBusiness: true
          }
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1
        }
      },
      orderBy: [
        { lastMessageAt: "desc" },
        { createdAt: "desc" }
      ],
      take: 50
    });

    return { conversations };
  });

  app.post("/conversations", { preHandler: authenticate }, async (request, reply) => {
    const authUser = requireAuthUser(request);
    const parsed = createConversationSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid conversation payload." });
    }

    if (parsed.data.buyerId !== authUser.userId && parsed.data.sellerId !== authUser.userId) {
      return reply.code(403).send({ error: "Conversation participant access required." });
    }

    if (parsed.data.buyerId === parsed.data.sellerId) {
      return reply.code(400).send({ error: "Conversation requires distinct buyer and seller." });
    }

    const existing = await prisma.conversation.findFirst({
      where: {
        buyerId: parsed.data.buyerId,
        sellerId: parsed.data.sellerId,
        listingId: parsed.data.listingId ?? null
      }
    });

    if (existing) {
      return { conversation: existing };
    }

    const conversation = await prisma.conversation.create({
      data: {
        buyerId: parsed.data.buyerId,
        sellerId: parsed.data.sellerId,
        listingId: parsed.data.listingId
      }
    });

    void writeAuditLog({
      request,
      actorUserId: authUser.userId,
      action: "CONVERSATION_CREATED",
      entityType: "CONVERSATION",
      entityId: conversation.id
    });

    return reply.code(201).send({ conversation });
  });

  app.get("/conversations/:id/messages", { preHandler: authenticate }, async (request, reply) => {
    const authUser = requireAuthUser(request);
    const params = conversationParamsSchema.safeParse(request.params);

    if (!params.success) {
      return reply.code(400).send({ error: "Invalid conversation ID." });
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: params.data.id },
      select: {
        id: true,
        buyerId: true,
        sellerId: true
      }
    });

    if (!conversation) {
      return reply.code(404).send({ error: "Conversation not found." });
    }

    if (!isConversationParticipant(conversation, authUser.userId)) {
      return reply.code(403).send({ error: "Conversation participant access required." });
    }

    const messages = await prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "asc" },
      take: 100
    });

    return {
      messages,
      conversationId: conversation.id
    };
  });

  app.post("/messages", { preHandler: authenticate }, async (request, reply) => {
    const authUser = requireAuthUser(request);
    const parsed = sendMessageSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid message payload." });
    }

    if (parsed.data.senderId !== authUser.userId) {
      return reply.code(403).send({ error: "Message sender must match authenticated user." });
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: parsed.data.conversationId },
      select: {
        id: true,
        buyerId: true,
        sellerId: true
      }
    });

    if (!conversation) {
      return reply.code(404).send({ error: "Conversation not found." });
    }

    if (!isConversationParticipant(conversation, authUser.userId)) {
      return reply.code(403).send({ error: "Conversation participant access required." });
    }

    const message = await prisma.$transaction(async (tx) => {
      const created = await tx.message.create({
        data: {
          conversationId: parsed.data.conversationId,
          senderId: authUser.userId,
          body: parsed.data.body
        }
      });

      await tx.conversation.update({
        where: { id: parsed.data.conversationId },
        data: { lastMessageAt: created.createdAt }
      });

      return created;
    });

    void writeAuditLog({
      request,
      actorUserId: authUser.userId,
      action: "MESSAGE_SENT",
      entityType: "MESSAGE",
      entityId: message.id,
      metadata: {
        conversationId: parsed.data.conversationId
      }
    });

    return reply.code(201).send({ message });
  });
}
