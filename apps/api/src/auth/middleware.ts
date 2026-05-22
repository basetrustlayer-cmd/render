import crypto from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../database/client.js";
import { writeAuditLog } from "../audit/log.js";
import { verifyAccessToken, type AuthTokenPayload } from "./jwt.js";

declare module "fastify" {
  interface FastifyRequest {
    authUser?: AuthTokenPayload;
  }
}

const csrfProtectedMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function hashCsrfToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function getHeaderValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function timingSafeEqualString(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);

  if (left.length !== right.length) {
    return false;
  }

  return crypto.timingSafeEqual(left, right);
}

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const header = request.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    void writeAuditLog({ request, action: "AUTH_MISSING_BEARER_TOKEN" });
    reply.code(401).send({ error: "Missing bearer token." });
    return;
  }

  try {
    const token = header.slice("Bearer ".length);
    const payload = verifyAccessToken(token);

    if (payload.isSuspended) {
      void writeAuditLog({ request, actorUserId: payload.userId, action: "AUTH_SUSPENDED_USER_REJECTED", entityType: "USER", entityId: payload.userId });
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
          expiresAt: true,
          csrfTokenHash: true
        }
      })
    ]);

    if (!user) {
      void writeAuditLog({ request, actorUserId: payload.userId, action: "AUTH_USER_NOT_FOUND", entityType: "USER", entityId: payload.userId });
      reply.code(401).send({ error: "User not found." });
      return;
    }

    if (user.isSuspended) {
      void writeAuditLog({ request, actorUserId: payload.userId, action: "AUTH_SUSPENDED_USER_REJECTED", entityType: "USER", entityId: payload.userId });
      reply.code(403).send({ error: "User account is suspended." });
      return;
    }

    if (
      !session ||
      session.userId !== payload.userId ||
      session.revokedAt ||
      session.expiresAt <= new Date()
    ) {
      void writeAuditLog({ request, actorUserId: payload.userId, action: "AUTH_SESSION_INVALID", entityType: "USER", entityId: payload.userId });
      reply.code(401).send({ error: "Session is no longer valid." });
      return;
    }

    if (csrfProtectedMethods.has(request.method.toUpperCase())) {
      const csrfToken = getHeaderValue(request.headers["x-render-csrf"]);

      if (!csrfToken || !session.csrfTokenHash) {
        void writeAuditLog({ request, actorUserId: payload.userId, action: "AUTH_CSRF_MISSING", entityType: "USER", entityId: payload.userId });
        reply.code(403).send({ error: "Missing CSRF token." });
        return;
      }

      const submittedHash = hashCsrfToken(csrfToken);

      if (!timingSafeEqualString(submittedHash, session.csrfTokenHash)) {
        void writeAuditLog({ request, actorUserId: payload.userId, action: "AUTH_CSRF_INVALID", entityType: "USER", entityId: payload.userId });
        reply.code(403).send({ error: "Invalid CSRF token." });
        return;
      }
    }

    request.authUser = payload;
  } catch {
    void writeAuditLog({ request, action: "AUTH_TOKEN_INVALID" });
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
