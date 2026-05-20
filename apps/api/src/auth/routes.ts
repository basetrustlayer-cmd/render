import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../database/client.js";
import { signAccessToken } from "./jwt.js";

const phoneSchema = z.object({
  phone: z.string().min(8).max(20)
});

const verifyOtpSchema = phoneSchema.extend({
  code: z.string().min(4).max(8)
});

type OtpRecord = {
  code: string;
  expiresAt: number;
  attempts: number;
  requestedAt: number;
};

const otpStore = new Map<string, OtpRecord>();

function normalizePhone(phone: string): string {
  return phone.replace(/\s+/g, "");
}

function generateOtp(): string {
  if (process.env.NODE_ENV !== "production" && process.env.OTP_DEV_CODE) {
    return process.env.OTP_DEV_CODE;
  }

  return String(Math.floor(100000 + Math.random() * 900000));
}

async function sendOtpSms(phone: string, code: string): Promise<void> {
  const smsUrl = process.env.HUBTEL_SMS_API_URL;
  const clientId = process.env.HUBTEL_CLIENT_ID;
  const clientSecret = process.env.HUBTEL_CLIENT_SECRET;
  const senderId = process.env.HUBTEL_SENDER_ID || "Render";

  if (!smsUrl || !clientId || !clientSecret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Hubtel SMS environment variables are required in production.");
    }

    console.log(`DEV OTP for ${phone}: ${code}`);
    return;
  }

  const response = await fetch(smsUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: senderId,
      to: phone,
      content: `Your Render.com.gh verification code is ${code}. It expires in 10 minutes.`
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Hubtel SMS failed ${response.status}: ${text}`);
  }
}

async function issueLogin(phone: string) {
  const trustlayerUserId = `phone_${phone}`;

  const user = await prisma.user.upsert({
    where: { trustlayerUserId },
    update: {
      phone,
      verificationLevel: 1
    },
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
}

export async function registerAuthRoutes(app: FastifyInstance): Promise<void> {
  app.post("/auth/request-otp", async (request, reply) => {
    const parsed = phoneSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({
        error: "Invalid phone number."
      });
    }

    const phone = normalizePhone(parsed.data.phone);
    const existing = otpStore.get(phone);
    const now = Date.now();

    if (existing && now - existing.requestedAt < 60_000) {
      return reply.code(429).send({
        error: "Please wait before requesting another OTP."
      });
    }

    const code = generateOtp();

    otpStore.set(phone, {
      code,
      expiresAt: now + 10 * 60_000,
      attempts: 0,
      requestedAt: now
    });

    await sendOtpSms(phone, code);

    return {
      ok: true,
      expiresInSeconds: 600,
      devCode: process.env.NODE_ENV !== "production" ? code : undefined
    };
  });

  app.post("/auth/verify-otp", async (request, reply) => {
    const parsed = verifyOtpSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({
        error: "Invalid OTP payload."
      });
    }

    const phone = normalizePhone(parsed.data.phone);
    const record = otpStore.get(phone);

    if (!record) {
      return reply.code(400).send({
        error: "OTP has not been requested or has expired."
      });
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(phone);
      return reply.code(400).send({
        error: "OTP has expired."
      });
    }

    if (record.attempts >= 5) {
      otpStore.delete(phone);
      return reply.code(429).send({
        error: "Too many OTP attempts. Request a new code."
      });
    }

    if (record.code !== parsed.data.code) {
      record.attempts += 1;
      return reply.code(400).send({
        error: "Invalid OTP code."
      });
    }

    otpStore.delete(phone);

    return issueLogin(phone);
  });

  app.post("/auth/dev/phone-login", async (request, reply) => {
    if (process.env.NODE_ENV === "production" || process.env.ENABLE_DEV_LOGIN !== "true") {
      return reply.code(404).send({
        error: "Not found."
      });
    }

    const parsed = phoneSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({
        error: "Invalid phone number."
      });
    }

    return issueLogin(normalizePhone(parsed.data.phone));
  });
}
