import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, requireAdmin, requireAuthUser, requireModerator } from "../auth/middleware.js";
import { writeAuditLog } from "../audit/log.js";
import { prisma } from "../database/client.js";

const idParamsSchema = z.object({
  id: z.string().uuid()
});

const suspendUserSchema = z.object({
  reason: z.string().min(3).max(500),
  moderationNotes: z.string().max(2000).optional()
});

const rejectListingSchema = z.object({
  reason: z.string().min(3).max(500)
});

export async function registerAdminRoutes(app: FastifyInstance): Promise<void> {
  app.get("/admin/users", { preHandler: [authenticate, requireAdmin] }, async (request) => {
    const authUser = requireAuthUser(request);

    const users = await prisma.user.findMany({
      select: {
        id: true,
        phone: true,
        email: true,
        role: true,
        verificationLevel: true,
        trustScore: true,
        trustTier: true,
        isBusiness: true,
        isSuspended: true,
        suspendedAt: true,
        suspendedReason: true,
        createdAt: true
      },
      orderBy: { createdAt: "desc" },
      take: 100
    });

    void writeAuditLog({
      request,
      actorUserId: authUser.userId,
      action: "ADMIN_USERS_VIEWED",
      entityType: "USER"
    });

    return { users };
  });

  app.post("/admin/users/:id/suspend", { preHandler: [authenticate, requireAdmin] }, async (request, reply) => {
    const authUser = requireAuthUser(request);
    const params = idParamsSchema.safeParse(request.params);
    const body = suspendUserSchema.safeParse(request.body);

    if (!params.success || !body.success) {
      return reply.code(400).send({ error: "Invalid user suspension payload." });
    }

    if (params.data.id === authUser.userId) {
      return reply.code(400).send({ error: "Admins cannot suspend their own account." });
    }

    const user = await prisma.user.update({
      where: { id: params.data.id },
      data: {
        isSuspended: true,
        suspendedAt: new Date(),
        suspendedReason: body.data.reason,
        moderationNotes: body.data.moderationNotes
      },
      select: {
        id: true,
        phone: true,
        role: true,
        isSuspended: true,
        suspendedAt: true,
        suspendedReason: true
      }
    });

    void writeAuditLog({
      request,
      actorUserId: authUser.userId,
      action: "ADMIN_USER_SUSPENDED",
      entityType: "USER",
      entityId: user.id,
      metadata: { reason: body.data.reason }
    });

    return { user };
  });

  app.post("/admin/users/:id/unsuspend", { preHandler: [authenticate, requireAdmin] }, async (request, reply) => {
    const authUser = requireAuthUser(request);
    const params = idParamsSchema.safeParse(request.params);

    if (!params.success) {
      return reply.code(400).send({ error: "Invalid user ID." });
    }

    const user = await prisma.user.update({
      where: { id: params.data.id },
      data: {
        isSuspended: false,
        suspendedAt: null,
        suspendedReason: null
      },
      select: {
        id: true,
        phone: true,
        role: true,
        isSuspended: true
      }
    });

    void writeAuditLog({
      request,
      actorUserId: authUser.userId,
      action: "ADMIN_USER_UNSUSPENDED",
      entityType: "USER",
      entityId: user.id
    });

    return { user };
  });

  app.get("/admin/listings/pending", { preHandler: [authenticate, requireModerator] }, async () => {
    const listings = await prisma.listing.findMany({
      where: {
        status: { in: ["PENDING", "MANUAL_REVIEW"] },
        deletedAt: null
      },
      include: {
        images: true,
        seller: {
          select: {
            id: true,
            phone: true,
            verificationLevel: true,
            trustScore: true,
            trustTier: true,
            isSuspended: true
          }
        }
      },
      orderBy: { createdAt: "asc" },
      take: 100
    });

    return { listings };
  });

  app.post("/admin/listings/:id/approve", { preHandler: [authenticate, requireModerator] }, async (request, reply) => {
    const authUser = requireAuthUser(request);
    const params = idParamsSchema.safeParse(request.params);

    if (!params.success) {
      return reply.code(400).send({ error: "Invalid listing ID." });
    }

    const listing = await prisma.listing.update({
      where: { id: params.data.id },
      data: { status: "LIVE" }
    });

    void writeAuditLog({
      request,
      actorUserId: authUser.userId,
      action: "ADMIN_LISTING_APPROVED",
      entityType: "LISTING",
      entityId: listing.id
    });

    return { listing };
  });

  app.post("/admin/listings/:id/reject", { preHandler: [authenticate, requireModerator] }, async (request, reply) => {
    const authUser = requireAuthUser(request);
    const params = idParamsSchema.safeParse(request.params);
    const body = rejectListingSchema.safeParse(request.body);

    if (!params.success || !body.success) {
      return reply.code(400).send({ error: "Invalid listing rejection payload." });
    }

    const listing = await prisma.listing.update({
      where: { id: params.data.id },
      data: { status: "REJECTED" }
    });

    void writeAuditLog({
      request,
      actorUserId: authUser.userId,
      action: "ADMIN_LISTING_REJECTED",
      entityType: "LISTING",
      entityId: listing.id,
      metadata: { reason: body.data.reason }
    });

    return { listing };
  });

  app.get("/admin/safe-deals/disputed", { preHandler: [authenticate, requireModerator] }, async () => {
    const safeDeals = await prisma.safeDeal.findMany({
      where: { status: "DISPUTED" },
      include: {
        listing: true,
        buyer: {
          select: { id: true, phone: true, email: true, trustScore: true, trustTier: true }
        },
        seller: {
          select: { id: true, phone: true, email: true, trustScore: true, trustTier: true }
        }
      },
      orderBy: { updatedAt: "desc" },
      take: 100
    });

    return { safeDeals };
  });

  app.get("/admin/audit-logs", { preHandler: [authenticate, requireAdmin] }, async () => {
    const auditLogs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100
    });

    return { auditLogs };
  });
}
