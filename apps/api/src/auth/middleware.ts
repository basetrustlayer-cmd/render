import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../database/client.js";
import { verifyAccessToken, type AuthTokenPayload } from "./jwt.js";

declare module "fastify" {
  interface FastifyRequest {
    authUser?: AuthTokenPayload;
  }
}

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const header = request.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    reply.code(401).send({ error: "Missing bearer token." });
    return;
  }

  try {
    const token = header.slice("Bearer ".length);
    const payload = verifyAccessToken(token);

    if (payload.isSuspended) {
      reply.code(403).send({ error: "User account is suspended." });
      return;
    }

    const [user, session] = await Promise.all([
      prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, isSuspended: true }
      }),
      prisma.authSession.findUnique({
        where: { jti: payload.jti },
        select: {
          id: true,
          userId: true,
          revokedAt: true,
          expiresAt: true
        }
      })
    ]);

    if (!user) {
      reply.code(401).send({ error: "User not found." });
      return;
    }

    if (user.isSuspended) {
      reply.code(403).send({ error: "User account is suspended." });
      return;
    }

    if (
      !session ||
      session.userId !== payload.userId ||
      session.revokedAt ||
      session.expiresAt <= new Date()
    ) {
      reply.code(401).send({ error: "Session is no longer valid." });
      return;
    }

    request.authUser = payload;
  } catch {
    reply.code(401).send({ error: "Invalid or expired token." });
  }
}

export function requireAuthUser(request: FastifyRequest): AuthTokenPayload {
  if (!request.authUser) {
    throw new Error("Authenticated user is required.");
  }

  return request.authUser;
}

const roleRank = {
  USER: 0,
  MODERATOR: 1,
  ADMIN: 2,
  SUPER_ADMIN: 3
} as const;

export type UserRoleName = keyof typeof roleRank;

export function requireRole(minimumRole: UserRoleName) {
  return async function requireRoleHandler(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    const authUser = requireAuthUser(request);

    const user = await prisma.user.findUnique({
      where: { id: authUser.userId },
      select: {
        id: true,
        role: true,
        isSuspended: true
      }
    });

    if (!user || user.isSuspended) {
      reply.code(403).send({ error: "Admin access denied." });
      return;
    }

    if (roleRank[user.role] < roleRank[minimumRole]) {
      reply.code(403).send({ error: "Insufficient permissions." });
      return;
    }
  };
}

export const requireModerator = requireRole("MODERATOR");
export const requireAdmin = requireRole("ADMIN");
export const requireSuperAdmin = requireRole("SUPER_ADMIN");
