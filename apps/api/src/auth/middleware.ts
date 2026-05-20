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

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, isSuspended: true }
    });

    if (!user) {
      reply.code(401).send({ error: "User not found." });
      return;
    }

    if (user.isSuspended) {
      reply.code(403).send({ error: "User account is suspended." });
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
