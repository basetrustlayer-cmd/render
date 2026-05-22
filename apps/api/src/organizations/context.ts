import type { FastifyRequest } from "fastify";
import { prisma } from "../database/client.js";

function firstHeaderValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function getRequestedOrganizationId(request: FastifyRequest): string | undefined {
  return firstHeaderValue(request.headers["x-render-organization-id"]);
}

export async function requireActiveOrganizationMembership(input: {
  userId: string;
  organizationId: string;
}) {
  return prisma.organizationMember.findFirst({
    where: {
      userId: input.userId,
      organizationId: input.organizationId,
      organization: {
        status: "ACTIVE"
      }
    },
    include: {
      organization: true
    }
  });
}

export async function resolveOptionalOrganizationContext(input: {
  request: FastifyRequest;
  userId: string;
}) {
  const organizationId = getRequestedOrganizationId(input.request);

  if (!organizationId) {
    return null;
  }

  const membership = await requireActiveOrganizationMembership({
    userId: input.userId,
    organizationId
  });

  return membership;
}
