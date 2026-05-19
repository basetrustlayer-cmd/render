import jwt from "jsonwebtoken";

export type AuthTokenPayload = {
  userId: string;
  verificationLevel: number;
  isBusiness: boolean;
  isSuspended: boolean;
};

export function signAccessToken(payload: AuthTokenPayload): string {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be set and at least 32 characters long.");
  }

  return jwt.sign(payload, secret, {
    expiresIn: "15m",
    issuer: "render-api"
  });
}

export function verifyAccessToken(token: string): AuthTokenPayload {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be set and at least 32 characters long.");
  }

  return jwt.verify(token, secret, {
    issuer: "render-api"
  }) as AuthTokenPayload;
}
