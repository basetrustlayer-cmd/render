import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../database/client.js";
import { authenticate, requireAuthUser } from "./middleware.js";
import { signAccessToken } from "./jwt.js";

const phoneSchema = z.object({
  phone: z.string().min(8).max(20)
});

const verifyOtpSchema = z.object({
  phone: z.string().min(8).max(20),
  code: z.string().min(4).max(8)
});

function toAuthResponse(user: {
  id: string;
  phone: string | null;
  verificationLevel: number;
  trustTier: string | null;
  isBusiness: boolean;
  isSuspended: boolean;
}) {
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
      phone: user.phone ?? "",
      verificationLevel: user.verificationLevel,
      trustTier: user.trustTier
    }
  };
}

export async function registerAuthRoutes(app: FastifyInstance): Promise<void> {
  app.post("/auth/otp/send", async (request, reply) => {
    const parsed = phoneSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid phone number." });
    }

    return {
      ok: true,
      delivery: process.env.HUBTEL_CLIENT_ID ? "hubtel_pending" : "dev_otp",
      devCode: process.env.NODE_ENV === "production" ? undefined : "000000"
    };
  });

  app.post("/auth/otp/verify", async (request, reply) => {
    const parsed = verifyOtpSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid OTP verification request." });
    }

    const { phone, code } = parsed.data;

    if (code !== "000000" && !process.env.HUBTEL_CLIENT_ID) {
      return reply.code(401).send({ error: "Invalid OTP code." });
    }

    const trustlayerUserId = `phone_${phone}`;

    const user = await prisma.user.upsert({
      where: { trustlayerUserId },
      update: { phone },
      create: {
        trustlayerUserId,
        phone,
        verificationLevel: 1
      }
    });

    return toAuthResponse(user);
  });

  app.post("/auth/dev/phone-login", async (request, reply) => {
    const parsed = phoneSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid phone number." });
    }

    const user = await prisma.user.upsert({
      where: { trustlayerUserId: `dev_${parsed.data.phone}` },
      update: { phone: parsed.data.phone },
      create: {
        trustlayerUserId: `dev_${parsed.data.phone}`,
        phone: parsed.data.phone,
        verificationLevel: 1
      }
    });

    return toAuthResponse(user);
  });

  app.get("/auth/me", { preHandler: authenticate }, async (request) => {
    const authUser = requireAuthUser(request);

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: authUser.userId },
      select: {
        id: true,
        phone: true,
        verificationLevel: true,
        trustTier: true,
        isBusiness: true,
        isSuspended: true
      }
    });

    return { user };
  });
}
