import jwt from "jsonwebtoken";

export type AuthTokenPayload = {
  userId: string;
  verificationLevel: number;
  isBusiness: boolean;
  isSuspended: boolean;
  jti: string;
};

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be set and at least 32 characters long.");
  }

  return secret;
}

export function signAccessToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: "15m",
    issuer: "render-api"
  });
}

export function verifyAccessToken(token: string): AuthTokenPayload {
  return jwt.verify(token, getJwtSecret(), {
    issuer: "render-api"
  }) as AuthTokenPayload;
}
