import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, requireAuthUser } from "../auth/middleware.js";
import { prisma } from "../database/client.js";
import { writeAuditLog } from "../audit/log.js";

const leadStatuses = ["NEW", "CONTACTED", "NEGOTIATING", "WON", "LOST"] as const;

const whatsappLeadSchema = z.object({
  listingId: z.string().uuid(),
  sellerId: z.string().uuid(),
  source: z.literal("WHATSAPP").default("WHATSAPP")
});

const leadIdParamsSchema = z.object({
  id: z.string().uuid()
});

const leadStatusUpdateSchema = z.object({
  status: z.enum(leadStatuses)
});

function auditMetadata(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export async function registerLeadRoutes(app: FastifyInstance): Promise<void> {
  app.post("/leads/whatsapp", { preHandler: authenticate }, async (request, reply) => {
    const authUser = requireAuthUser(request);
    const parsed = whatsappLeadSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid WhatsApp lead payload." });
    }

    const listing = await prisma.listing.findFirst({
      where: {
        id: parsed.data.listingId,
        sellerId: parsed.data.sellerId,
        deletedAt: null
      },
      select: {
        id: true,
        sellerId: true,
        organizationId: true,
        title: true,
        status: true
      }
    });

    if (!listing) {
      return reply.code(404).send({ error: "Listing not found for WhatsApp lead." });
    }

    if (listing.sellerId === authUser.userId) {
      return reply.code(400).send({ error: "Seller cannot create a lead on their own listing." });
    }

    void writeAuditLog({
      request,
      actorUserId: authUser.userId,
      organizationId: listing.organizationId,
      action: "WHATSAPP_LEAD_CREATED",
      entityType: "LISTING",
      entityId: listing.id,
      metadata: {
        listingId: listing.id,
        listingTitle: listing.title,
        sellerId: listing.sellerId,
        buyerId: authUser.userId,
        source: "WHATSAPP",
        leadSystem: "AUDIT_LOG_READ_MODEL",
        futureWhispeRMSync: true
      }
    });

    void writeAuditLog({
      request,
      actorUserId: authUser.userId,
      organizationId: listing.organizationId,
      action: "SELLER_LEAD_RECEIVED",
      entityType: "USER",
      entityId: listing.sellerId,
      metadata: {
        listingId: listing.id,
        listingTitle: listing.title,
        sellerId: listing.sellerId,
        buyerId: authUser.userId,
        source: "WHATSAPP",
        notificationStatus: "UNREAD",
        notificationType: "SELLER_LEAD"
      }
    });

    return reply.code(201).send({
      ok: true,
      lead: {
        source: "WHATSAPP",
        status: "CAPTURED",
        listingId: listing.id,
        sellerId: listing.sellerId
      }
    });
  });

  app.get("/leads/my", { preHandler: authenticate }, async (request) => {
    const authUser = requireAuthUser(request);

    const logs = await prisma.auditLog.findMany({
      where: {
        action: "WHATSAPP_LEAD_CREATED",
        metadata: {
          path: ["sellerId"],
          equals: authUser.userId
        }
      },
      orderBy: { createdAt: "desc" },
      take: 50
    });

    const statusLogs = await prisma.auditLog.findMany({
      where: {
        action: "SELLER_LEAD_STATUS_UPDATED",
        actorUserId: authUser.userId
      },
      orderBy: { createdAt: "desc" },
      take: 200
    });

    const latestStatusByLeadId = new Map<string, string>();

    statusLogs.forEach((log) => {
      const metadata = auditMetadata(log.metadata);
      const leadId = String(metadata.leadId ?? "");

      if (leadId && !latestStatusByLeadId.has(leadId)) {
        latestStatusByLeadId.set(leadId, String(metadata.status ?? "NEW"));
      }
    });

    return {
      leads: logs.map((log) => {
        const metadata = auditMetadata(log.metadata);

        return {
          id: log.id,
          source: metadata.source ?? "WHATSAPP",
          status: latestStatusByLeadId.get(log.id) ?? "NEW",
          listingId: metadata.listingId ?? log.entityId,
          listingTitle: metadata.listingTitle ?? "Listing",
          sellerId: metadata.sellerId ?? authUser.userId,
          buyerId: metadata.buyerId ?? log.actorUserId,
          whispeRMExportStatus: "NOT_EXPORTED",
          notificationStatus: "UNREAD",
          createdAt: log.createdAt
        };
      })
    };
  });

  app.post("/leads/:id/status", { preHandler: authenticate }, async (request, reply) => {
    const authUser = requireAuthUser(request);
    const params = leadIdParamsSchema.safeParse(request.params);
    const body = leadStatusUpdateSchema.safeParse(request.body);

    if (!params.success || !body.success) {
      return reply.code(400).send({ error: "Invalid lead status payload." });
    }

    const leadLog = await prisma.auditLog.findFirst({
      where: {
        id: params.data.id,
        action: "WHATSAPP_LEAD_CREATED"
      }
    });

    if (!leadLog) {
      return reply.code(404).send({ error: "Lead not found." });
    }

    const metadata = auditMetadata(leadLog.metadata);

    if (metadata.sellerId !== authUser.userId) {
      return reply.code(403).send({ error: "Only the seller can update this lead." });
    }

    void writeAuditLog({
      request,
      actorUserId: authUser.userId,
      organizationId: leadLog.organizationId,
      action: "SELLER_LEAD_STATUS_UPDATED",
      entityType: "LEAD",
      entityId: leadLog.id,
      metadata: {
        leadId: leadLog.id,
        status: body.data.status,
        listingId: metadata.listingId ?? leadLog.entityId,
        sellerId: metadata.sellerId,
        buyerId: metadata.buyerId ?? leadLog.actorUserId
      }
    });

    return {
      ok: true,
      leadId: leadLog.id,
      status: body.data.status
    };
  });

  app.post("/leads/:id/whisperm-export", { preHandler: authenticate }, async (request, reply) => {
    const authUser = requireAuthUser(request);
    const params = leadIdParamsSchema.safeParse(request.params);

    if (!params.success) {
      return reply.code(400).send({ error: "Invalid lead ID." });
    }

    const leadLog = await prisma.auditLog.findFirst({
      where: {
        id: params.data.id,
        action: "WHATSAPP_LEAD_CREATED"
      }
    });

    if (!leadLog) {
      return reply.code(404).send({ error: "Lead not found." });
    }

    const metadata = auditMetadata(leadLog.metadata);

    if (metadata.sellerId !== authUser.userId) {
      return reply.code(403).send({ error: "Only the seller can export this lead." });
    }

    void writeAuditLog({
      request,
      actorUserId: authUser.userId,
      organizationId: leadLog.organizationId,
      action: "WHISPERM_LEAD_EXPORT_QUEUED",
      entityType: "LEAD",
      entityId: leadLog.id,
      metadata: {
        sourceLeadAuditLogId: leadLog.id,
        source: "RENDER",
        channel: metadata.source ?? "WHATSAPP",
        listingId: metadata.listingId ?? leadLog.entityId,
        listingTitle: metadata.listingTitle ?? "Listing",
        sellerId: metadata.sellerId,
        buyerId: metadata.buyerId ?? leadLog.actorUserId,
        exportStatus: "QUEUED",
        integration: "WHISPERM",
        externalSync: "PENDING_IMPLEMENTATION"
      }
    });

    return reply.code(202).send({
      ok: true,
      exportStatus: "QUEUED",
      integration: "WHISPERM",
      externalSync: "PENDING_IMPLEMENTATION"
    });
  });
}
