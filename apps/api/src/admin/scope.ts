import type { FastifyReply, FastifyRequest } from "fastify";
import { requireAuthUser } from "../auth/middleware.js";
import { getRequestedOrganizationId, requireActiveOrganizationMembership } from "../organizations/context.js";

export type AdminOrganizationScope = {
  authUser: ReturnType<typeof requireAuthUser>;
  organizationId: string | null;
};

export async function requireAdminOrganizationScope(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<AdminOrganizationScope | null> {
  const authUser = requireAuthUser(request);
  const organizationId = getRequestedOrganizationId(request);

  if (!organizationId) {
    return { authUser, organizationId: null };
  }

  const membership = await requireActiveOrganizationMembership({
    userId: authUser.userId,
    organizationId
  });

  if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
    reply.code(403).send({ error: "Invalid organization admin context." });
    return null;
  }

  return { authUser, organizationId };
}
