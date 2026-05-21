import crypto from "node:crypto";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../database/client.js";
import { authenticate, requireAuthUser } from "./middleware.js";
import { sendOtpSms } from "../notifications/hubtel.js";
import { signAccessToken } from "./jwt.js";

const phoneSchema = z.object({
  phone: z.string().min(8).max(20)
});

const verifyOtpSchema = z.object({
  phone: z.string().min(8).max(20),
  code: z.string().min(4).max(8)
});

function hashOtp(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

function generateOtp(): string {
  return String(crypto.randomInt(100000, 1000000));
}

function hashRefreshToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function toAuthResponse(user: {
  id: string;
  phone: string | null;
  verificationLevel: number;
  trustTier: string | null;
  isBusiness: boolean;
  isSuspended: boolean;
}, requestMeta?: {
  userAgent?: string;
  ipAddress?: string;
}) {
  const jti = crypto.randomUUID();
  const refreshToken = crypto.randomBytes(48).toString("base64url");

  await prisma.authSession.create({
    data: {
      userId: user.id,
      jti,
      refreshTokenHash: hashRefreshToken(refreshToken),
      userAgent: requestMeta?.userAgent,
      ipAddress: requestMeta?.ipAddress,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    }
  });

  const accessToken = signAccessToken({
    userId: user.id,
    verificationLevel: user.verificationLevel,
    isBusiness: user.isBusiness,
    isSuspended: user.isSuspended,
    jti
  });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      phone: user.phone ?? "",
      verificationLevel: user.verificationLevel,
      trustTier: user.trustTier
    }
  };
}

export async function registerAuthRoutes(app: FastifyInstance): Promise<void> {
  app.post("/auth/otp/send", {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: "15 minutes"
      }
    }
  }, async (request, reply) => {
    const parsed = phoneSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid phone number." });
    }

    const recentChallenge = await prisma.otpChallenge.findFirst({
      where: {
        phone: parsed.data.phone,
        createdAt: { gt: new Date(Date.now() - 60 * 1000) }
      },
      orderBy: { createdAt: "desc" }
    });

    if (recentChallenge) {
      return reply.code(429).send({
        error: "Please wait 60 seconds before requesting another OTP code."
      });
    }

    await prisma.otpChallenge.updateMany({
      where: {
        phone: parsed.data.phone,
        consumedAt: null
      },
      data: {
        consumedAt: new Date()
      }
    });

    const code = generateOtp();

    const delivery = await sendOtpSms({
      phone: parsed.data.phone,
      code
    });

    await prisma.otpChallenge.create({
      data: {
        phone: parsed.data.phone,
        codeHash: hashOtp(code),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000)
      }
    });

    return {
      ok: true,
      delivery: delivery.provider === "HUBTEL" ? "sms_sent" : "dev_otp",
      devCode: process.env.NODE_ENV === "production" ? undefined : code
    };
  });

  app.post("/auth/otp/verify", {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: "15 minutes"
      }
    }
  }, async (request, reply) => {
    const parsed = verifyOtpSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid OTP verification request." });
    }

    const { phone, code } = parsed.data;

    const challenge = await prisma.otpChallenge.findFirst({
      where: {
        phone,
        consumedAt: null,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: "desc" }
    });

    if (!challenge || challenge.attempts >= 5 || challenge.codeHash !== hashOtp(code)) {
      if (challenge) {
        await prisma.otpChallenge.update({
          where: { id: challenge.id },
          data: { attempts: { increment: 1 } }
        });
      }

      return reply.code(401).send({ error: "Invalid or expired OTP code." });
    }

    await prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: { consumedAt: new Date() }
    });

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

    return toAuthResponse(user, {
      userAgent: request.headers["user-agent"],
      ipAddress: request.ip
    });
  });

  if (process.env.NODE_ENV !== "production") {
    app.post("/auth/dev/phone-login", {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: "15 minutes"
        }
      }
    }, async (request, reply) => {
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

      return toAuthResponse(user, {
        userAgent: request.headers["user-agent"],
        ipAddress: request.ip
      });
    });
  }

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
