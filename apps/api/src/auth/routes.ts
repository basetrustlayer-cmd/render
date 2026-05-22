import crypto from "node:crypto";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../database/client.js";
import { authenticate, requireAuthUser } from "./middleware.js";
import { sendOtpSms } from "../notifications/hubtel.js";
import { signAccessToken } from "./jwt.js";
import { writeAuditLog } from "../audit/log.js";

const phoneSchema = z.object({
  phone: z.string().min(8).max(20)
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(32),
  deviceFingerprint: z.string().min(16).max(256).optional()
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

function hashOptional(value: string | undefined): string | undefined {
  return value ? crypto.createHash("sha256").update(value).digest("hex") : undefined;
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
  deviceFingerprint?: string;
}) {
  const jti = crypto.randomUUID();
  const refreshToken = crypto.randomBytes(48).toString("base64url");
  const csrfToken = crypto.randomBytes(32).toString("base64url");

  await prisma.authSession.create({
    data: {
      userId: user.id,
      jti,
      refreshTokenHash: hashRefreshToken(refreshToken),
      csrfTokenHash: hashRefreshToken(csrfToken),
      deviceFingerprintHash: hashOptional(requestMeta?.deviceFingerprint),
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
    csrfToken,
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
      void writeAuditLog({ request, action: "AUTH_OTP_SEND_INVALID" });
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
      void writeAuditLog({ request, action: "AUTH_OTP_SEND_THROTTLED", metadata: { phone: parsed.data.phone } });
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

    void writeAuditLog({ request, action: "AUTH_OTP_SENT", metadata: { phone: parsed.data.phone, delivery: delivery.provider } });

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

      void writeAuditLog({ request, action: "AUTH_OTP_VERIFY_FAILED", metadata: { phone } });
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

    void writeAuditLog({ request, actorUserId: user.id, action: "AUTH_LOGIN_SUCCESS", entityType: "USER", entityId: user.id });

<<<<<<< HEAD
    return toAuthResponse(user, {
=======
    void writeAuditLog({ request, actorUserId: user.id, action: "AUTH_DEV_LOGIN_SUCCESS", entityType: "USER", entityId: user.id });

      return toAuthResponse(user, {
>>>>>>> origin/security-day5-wire-audit-events
      userAgent: request.headers["user-agent"],
      ipAddress: request.ip,
      deviceFingerprint: request.headers["x-render-device-fingerprint"] as string | undefined
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

      void writeAuditLog({ request, actorUserId: user.id, action: "AUTH_DEV_LOGIN_SUCCESS", entityType: "USER", entityId: user.id });

      return toAuthResponse(user, {
        userAgent: request.headers["user-agent"],
        ipAddress: request.ip,
        deviceFingerprint: request.headers["x-render-device-fingerprint"] as string | undefined
      });
    });
  }

  app.post("/auth/refresh", {
    config: {
      rateLimit: {
        max: 20,
        timeWindow: "15 minutes"
      }
    }
  }, async (request, reply) => {
    const parsed = refreshTokenSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid refresh token payload." });
    }

    const refreshTokenHash = hashRefreshToken(parsed.data.refreshToken);
    const deviceFingerprintHash = hashOptional(parsed.data.deviceFingerprint);

    const session = await prisma.authSession.findUnique({
      where: { refreshTokenHash },
      include: {
        user: {
          select: {
            id: true,
            phone: true,
            verificationLevel: true,
            trustTier: true,
            isBusiness: true,
            isSuspended: true
          }
        }
      }
    });

    if (
      !session ||
      session.revokedAt ||
      session.expiresAt <= new Date() ||
      (session.deviceFingerprintHash && session.deviceFingerprintHash !== deviceFingerprintHash)
    ) {
      void writeAuditLog({ request, action: "AUTH_REFRESH_FAILED" });
      return reply.code(401).send({ error: "Invalid or expired refresh token." });
    }

    if (session.user.isSuspended) {
      await prisma.authSession.update({
        where: { id: session.id },
        data: { revokedAt: new Date() }
      });

      return reply.code(403).send({ error: "User account is suspended." });
    }

    await prisma.authSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date() }
    });

    void writeAuditLog({ request, actorUserId: session.user.id, action: "AUTH_REFRESH_SUCCESS", entityType: "USER", entityId: session.user.id });

    return toAuthResponse(session.user, {
      userAgent: request.headers["user-agent"],
      ipAddress: request.ip,
      deviceFingerprint: parsed.data.deviceFingerprint
    });
  });

  app.post("/auth/logout", { preHandler: authenticate }, async (request) => {
    const authUser = requireAuthUser(request);

    await prisma.authSession.updateMany({
      where: {
        userId: authUser.userId,
        jti: authUser.jti,
        revokedAt: null
      },
      data: {
        revokedAt: new Date()
      }
    });

    void writeAuditLog({ request, actorUserId: authUser.userId, action: "AUTH_LOGOUT", entityType: "USER", entityId: authUser.userId });

    return { ok: true };
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
