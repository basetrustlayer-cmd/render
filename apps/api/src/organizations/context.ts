import type { FastifyRequest } from "fastify";
import { z } from "zod";
import { prisma } from "../database/client.js";

const organizationIdSchema = z.string().uuid();

function firstHeaderValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function getRequestedOrganizationId(request: FastifyRequest): string | undefined {
  const raw = firstHeaderValue(request.headers["x-render-organization-id"]);
  if (!raw) return undefined;

  const parsed = organizationIdSchema.safeParse(raw);
  return parsed.success ? parsed.data : undefined;
}

export async function requireActiveOrganizationMembership(input: {
  userId: string;
  organizationId: string;
}) {
  return prisma.organizationMember.findFirst({
    where: {
      userId: input.userId,
      organizationId: input.organizationId,
      organization: { status: "ACTIVE" }
    },
    include: { organization: true }
  });
}

export async function resolveOptionalOrganizationContext(input: {
  request: FastifyRequest;
  userId: string;
}) {
  const organizationId = getRequestedOrganizationId(input.request);
  if (!organizationId) return null;

  return requireActiveOrganizationMembership({
    userId: input.userId,
    organizationId
  });
}

export async function requireListingOrganizationAccess(input: {
  request: FastifyRequest;
  userId: string;
  organizationId: string | null;
}) {
  if (!input.organizationId) return true;

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
