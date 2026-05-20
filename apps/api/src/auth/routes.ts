import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../database/client.js";
import { signAccessToken } from "./jwt.js";

const phoneLoginSchema = z.object({
  phone: z.string().min(8).max(20)
});

export async function registerAuthRoutes(app: FastifyInstance): Promise<void> {
  app.post("/auth/dev/phone-login", async (request, reply) => {
    const parsed = phoneLoginSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({
        error: "Invalid phone number."
      });
    }

    const { phone } = parsed.data;
    const trustlayerUserId = `dev_${phone}`;

    const user = await prisma.user.upsert({
      where: { trustlayerUserId },
      update: { phone },
      create: {
        trustlayerUserId,
        phone,
        verificationLevel: 1
      }
    });

    const accessToken = signAccessToken({
      userId: user.id,
      verificationLevel: user.verificationLevel,
      isBusiness: user.isBusiness,
      isSuspended: user.isSuspended
    });

    return {
      accessToken,
      user: {
        id: user.id,
        phone: user.phone,
        verificationLevel: user.verificationLevel,
        trustTier: user.trustTier
      }
    };
  });
}
