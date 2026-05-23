import crypto from "node:crypto";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { authenticate, requireAuthUser } from "../auth/middleware.js";
import { prisma } from "../database/client.js";
import { createRenderEvent, RENDER_EVENT_TYPES } from "@render/events";
import { createRenderQueue, RENDER_QUEUE_NAMES, type MessagingNotificationFanoutJobData } from "@render/queue";
import { writeAuditLog } from "../audit/log.js";
import {
  getRequestedOrganizationId,
  requireActiveOrganizationMembership
} from "../organizations/context.js";

const createConversationSchema = z.object({
  buyerId: z.string().uuid(),
  sellerId: z.string().uuid(),
  listingId: z.string().uuid().optional()
});

const conversationParamsSchema = z.object({
  id: z.string().uuid()
});

const messageParamsSchema = z.object({
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


async function enqueueMessagingNotificationFanout(input: {
  request: FastifyRequest;
  eventId: string;
  eventType: MessagingNotificationFanoutJobData["eventType"];
  conversationId: string;
  messageId?: string;
  senderId?: string;
  recipientUserIds: string[];
  organizationId?: string | null;
}): Promise<void> {
  try {
    const queue = createRenderQueue(RENDER_QUEUE_NAMES.messagingNotificationFanout);

    const data: MessagingNotificationFanoutJobData = {
      eventId: input.eventId,
      eventType: input.eventType,
      conversationId: input.conversationId,
      messageId: input.messageId,
      senderId: input.senderId,
      recipientUserIds: input.recipientUserIds,
      organizationId: input.organizationId,
      triggeredAt: new Date().toISOString(),
      correlationId: input.request.id
    };

    const job = await queue.add("messaging.notification_fanout", data);
    await queue.close();

    void writeAuditLog({
      request: input.request,
      organizationId: input.organizationId,
      action: "MESSAGING_NOTIFICATION_FANOUT_ENQUEUED",
      entityType: "QUEUE",
      entityId: String(job.id ?? ""),
      metadata: {
        queue: RENDER_QUEUE_NAMES.messagingNotificationFanout,
        eventId: input.eventId,
        eventType: input.eventType,
        conversationId: input.conversationId,
        messageId: input.messageId,
        recipientUserIds: input.recipientUserIds,
        correlationId: input.request.id
      }
    });
  } catch {
    void writeAuditLog({
      request: input.request,
      organizationId: input.organizationId,
      action: "MESSAGING_NOTIFICATION_FANOUT_SKIPPED",
      entityType: "QUEUE",
      entityId: input.eventId,
      metadata: {
        queue: RENDER_QUEUE_NAMES.messagingNotificationFanout,
        eventType: input.eventType,
        reason: "QUEUE_UNAVAILABLE",
        correlationId: input.request.id
      }
    });
  }
}

async function resolveMessagingOrganizationContext(request: FastifyRequest, userId: string): Promise<string | null> {
  const organizationId = getRequestedOrganizationId(request);

  if (!organizationId) {
    return null;
  }

  const membership = await requireActiveOrganizationMembership({
    userId,
    organizationId
  });

  return membership ? organizationId : null;
}

async function enforceConversationTenantAccess(input: {
  request: FastifyRequest;
  userId: string;
  organizationId: string | null;
}): Promise<boolean> {
  if (!input.organizationId) {
    return true;
  }

  const requestedOrganizationId = getRequestedOrganizationId(input.request);

  if (requestedOrganizationId !== input.organizationId) {
    return false;
  }

  const membership = await requireActiveOrganizationMembership({
    userId: input.userId,
    organizationId: input.organizationId
  });

  return Boolean(membership);
}

export async function registerMessagingRoutes(app: FastifyInstance): Promise<void> {
  app.get("/conversations", { preHandler: authenticate }, async (request, reply) => {
    const authUser = requireAuthUser(request);
    const requestedOrganizationId = getRequestedOrganizationId(request);

    if (requestedOrganizationId) {
      const membership = await requireActiveOrganizationMembership({
        userId: authUser.userId,
        organizationId: requestedOrganizationId
      });

      if (!membership) {
        return reply.code(403).send({ error: "Invalid organization context." });
      }
    }

    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [
          { buyerId: authUser.userId },
          { sellerId: authUser.userId }
        ],
        ...(requestedOrganizationId
          ? { organizationId: requestedOrganizationId }
          : { organizationId: null })
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

    const organizationId = await resolveMessagingOrganizationContext(request, authUser.userId);

    if (getRequestedOrganizationId(request) && !organizationId) {
      return reply.code(403).send({ error: "Invalid organization context." });
    }

    const existing = await prisma.conversation.findFirst({
      where: {
        buyerId: parsed.data.buyerId,
        sellerId: parsed.data.sellerId,
        listingId: parsed.data.listingId ?? null,
        organizationId
      }
    });

    if (existing) {
      return { conversation: existing };
    }

    const conversation = await prisma.conversation.create({
      data: {
        buyerId: parsed.data.buyerId,
        sellerId: parsed.data.sellerId,
        listingId: parsed.data.listingId,
        organizationId
      }
    });

    const conversationCreatedEvent = createRenderEvent({
      id: crypto.randomUUID(),
      type: RENDER_EVENT_TYPES.conversationCreated,
      aggregateId: conversation.id,
      correlationId: request.id,
      source: "render.api",
      payload: {
        conversationId: conversation.id,
        buyerId: conversation.buyerId,
        sellerId: conversation.sellerId,
        listingId: conversation.listingId,
        organizationId
      }
    });

    void writeAuditLog({
      request,
      actorUserId: authUser.userId,
      organizationId,
      action: "CONVERSATION_CREATED",
      entityType: "CONVERSATION",
      entityId: conversation.id,
      metadata: JSON.parse(JSON.stringify(conversationCreatedEvent))
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
        sellerId: true,
        organizationId: true
      }
    });

    if (!conversation) {
      return reply.code(404).send({ error: "Conversation not found." });
    }

    if (!isConversationParticipant(conversation, authUser.userId)) {
      return reply.code(403).send({ error: "Conversation participant access required." });
    }

    const hasTenantAccess = await enforceConversationTenantAccess({
      request,
      userId: authUser.userId,
      organizationId: conversation.organizationId
    });

    if (!hasTenantAccess) {
      return reply.code(403).send({ error: "Invalid organization context." });
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

  app.post("/messages/:id/read", { preHandler: authenticate }, async (request, reply) => {
    const authUser = requireAuthUser(request);
    const params = messageParamsSchema.safeParse(request.params);

    if (!params.success) {
      return reply.code(400).send({ error: "Invalid message ID." });
    }

    const message = await prisma.message.findUnique({
      where: { id: params.data.id },
      include: {
        conversation: {
          select: {
            id: true,
            buyerId: true,
            sellerId: true,
            organizationId: true
          }
        }
      }
    });

    if (!message) {
      return reply.code(404).send({ error: "Message not found." });
    }

    if (!isConversationParticipant(message.conversation, authUser.userId)) {
      return reply.code(403).send({ error: "Conversation participant access required." });
    }

    const hasTenantAccess = await enforceConversationTenantAccess({
      request,
      userId: authUser.userId,
      organizationId: message.conversation.organizationId
    });

    if (!hasTenantAccess) {
      return reply.code(403).send({ error: "Invalid organization context." });
    }

    if (message.senderId === authUser.userId) {
      return reply.code(403).send({ error: "Message sender cannot mark own message as read." });
    }

    if (message.readAt) {
      return {
        message,
        read: true
      };
    }

    const readMessage = await prisma.message.update({
      where: { id: message.id },
      data: { readAt: new Date() }
    });

    const messageReadEvent = createRenderEvent({
      id: crypto.randomUUID(),
      type: RENDER_EVENT_TYPES.messageRead,
      aggregateId: readMessage.id,
      correlationId: request.id,
      source: "render.api",
      payload: {
        messageId: readMessage.id,
        conversationId: message.conversation.id,
        readerId: authUser.userId,
        organizationId: message.conversation.organizationId
      }
    });

    void writeAuditLog({
      request,
      actorUserId: authUser.userId,
      organizationId: message.conversation.organizationId,
      action: "MESSAGE_READ",
      entityType: "MESSAGE",
      entityId: readMessage.id,
      metadata: JSON.parse(JSON.stringify(messageReadEvent))
    });

    return {
      message: readMessage,
      read: true
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
        sellerId: true,
        organizationId: true
      }
    });

    if (!conversation) {
      return reply.code(404).send({ error: "Conversation not found." });
    }

    if (!isConversationParticipant(conversation, authUser.userId)) {
      return reply.code(403).send({ error: "Conversation participant access required." });
    }

    const hasTenantAccess = await enforceConversationTenantAccess({
      request,
      userId: authUser.userId,
      organizationId: conversation.organizationId
    });

    if (!hasTenantAccess) {
      return reply.code(403).send({ error: "Invalid organization context." });
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

    const messageSentEvent = createRenderEvent({
      id: crypto.randomUUID(),
      type: RENDER_EVENT_TYPES.messageSent,
      aggregateId: message.id,
      correlationId: request.id,
      source: "render.api",
      payload: {
        messageId: message.id,
        conversationId: parsed.data.conversationId,
        senderId: authUser.userId,
        organizationId: conversation.organizationId
      }
    });

    void writeAuditLog({
      request,
      actorUserId: authUser.userId,
      organizationId: conversation.organizationId,
      action: "MESSAGE_SENT",
      entityType: "MESSAGE",
      entityId: message.id,
      metadata: JSON.parse(JSON.stringify(messageSentEvent))
    });

    void enqueueMessagingNotificationFanout({
      request,
      eventId: messageSentEvent.id,
      eventType: RENDER_EVENT_TYPES.messageSent,
      conversationId: conversation.id,
      messageId: message.id,
      senderId: authUser.userId,
      recipientUserIds: [
        conversation.buyerId === authUser.userId ? conversation.sellerId : conversation.buyerId
      ],
      organizationId: conversation.organizationId
    });

    return reply.code(201).send({ message });
  });
}
