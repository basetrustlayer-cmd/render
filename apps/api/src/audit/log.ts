import type { FastifyRequest } from "fastify";
import { Prisma } from "@prisma/client";
import { prisma } from "../database/client.js";

export async function writeAuditLog(input: {
  request?: FastifyRequest;
  actorUserId?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorUserId: input.actorUserId ?? null,
        action: input.action,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        ipAddress: input.request?.ip,
        userAgent: input.request?.headers["user-agent"],
        metadata: input.metadata ?? Prisma.JsonNull
      }
    });
  } catch {
    // Audit logging must never block marketplace/auth flows.
  }
}
