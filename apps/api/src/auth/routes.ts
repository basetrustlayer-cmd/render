import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { signAccessToken } from "./jwt.js";

const phoneLoginSchema = z.object({
  phone: z.string().min(8).max(20)
});

export async function registerAuthRoutes(app: FastifyInstance): Promise<void> {
  app.post("/auth/dev/phone-login", async (request, reply) => {
    const parsed = phoneLoginSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid phone number." });
    }

    const userId = "00000000-0000-4000-8000-000000000001";

    const accessToken = signAccessToken({
      userId,
      verificationLevel: 1,
      isBusiness: false,
      isSuspended: false
    });

    return {
      accessToken,
      user: {
        id: userId,
        phone: parsed.data.phone,
        verificationLevel: 1,
        trustTier: null
      }
    };
  });
}
