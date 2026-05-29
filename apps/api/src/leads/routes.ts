import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, requireAuthUser } from "../auth/middleware.js";
import { prisma } from "../database/client.js";
import { writeAuditLog } from "../audit/log.js";

const whatsappLeadSchema = z.object({
  listingId: z.string().uuid(),
  sellerId: z.string().uuid(),
  source: z.literal("WHATSAPP").default("WHATSAPP")
});

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
}
