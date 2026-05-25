import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("auth route contract", () => {
  const source = readFileSync(resolve(process.cwd(), "src/auth/routes.ts"), "utf8");

  it("keeps profile routes authenticated", () => {
    expect(source).toContain('app.get("/me", { preHandler: authenticate }');
    expect(source).toContain('app.put("/me", { preHandler: authenticate }');
    expect(source).toContain("requireAuthUser(request)");
  });

  it("validates profile update payload boundaries", () => {
    expect(source).toContain("profileUpdateSchema.safeParse(request.body)");
    expect(source).toContain("email: z.string().email().optional()");
    expect(source).toContain("whatsappNumber: z.string().min(8).max(20).optional()");
    expect(source).toContain("isBusiness: z.boolean().optional()");
    expect(source).toContain("Invalid profile update payload.");
  });

  it("uses Prisma-backed profile persistence", () => {
    expect(source).toContain("prisma.user.findUnique");
    expect(source).toContain("prisma.user.update");
    expect(source).toContain("where: { id: authUser.userId }");
    expect(source).toContain("User profile not found.");
    expect(source).not.toContain("User profile persistence pending.");
  });

  it("returns only Render-owned user profile fields", () => {
    expect(source).toContain("email: true");
    expect(source).toContain("phone: true");
    expect(source).toContain("whatsappNumber: true");
    expect(source).toContain("isBusiness: true");
    expect(source).toContain("role: true");
  });

  it("audits profile updates without changing TrustLayer authority", () => {
    expect(source).toContain("USER_PROFILE_UPDATED");
    expect(source).toContain("updatedFields: Object.keys(parsed.data)");
    expect(source).not.toContain("verificationLevel: parsed.data");
    expect(source).not.toContain("trustScore: parsed.data");
    expect(source).not.toContain("trustTier: parsed.data");
    expect(source).not.toContain("createTrustLayerClient");
  });
  it("hashes OTP codes with SHA-256 before persistence or comparison", () => {
    expect(source).toContain('function hashOtp(code: string): string');
    expect(source).toContain('crypto.createHash("sha256").update(code).digest("hex")');
    expect(source).toContain("codeHash: hashOtp(code)");
    expect(source).toContain("challenge.codeHash !== hashOtp(code)");
    expect(source).not.toContain("code: code");
  });

  it("expires OTP challenges after exactly ten minutes", () => {
    expect(source).toContain("expiresAt: new Date(Date.now() + 10 * 60 * 1000)");
    expect(source).toContain("expiresAt: { gt: new Date() }");
  });

  it("enforces a 60-second OTP resend cooldown", () => {
    expect(source).toContain("createdAt: { gt: new Date(Date.now() - 60 * 1000) }");
    expect(source).toContain("AUTH_OTP_SEND_THROTTLED");
    expect(source).toContain("Please wait 60 seconds before requesting another OTP code.");
  });

  it("locks OTP verification after five failed attempts", () => {
    expect(source).toContain("challenge.attempts >= 5");
    expect(source).toContain("attempts: { increment: 1 }");
    expect(source).toContain("AUTH_OTP_VERIFY_FAILED");
  });

  it("rejects the reserved 000000 OTP in production", () => {
    expect(source).toContain("function isForbiddenProductionOtp(code: string): boolean");
    expect(source).toContain('process.env.NODE_ENV === "production" && code === "000000"');
    expect(source).toContain("AUTH_OTP_VERIFY_FORBIDDEN_CODE");
  });

  it("consumes older active OTP challenges before issuing a new one", () => {
    expect(source).toContain("prisma.otpChallenge.updateMany");
    expect(source).toContain("consumedAt: null");
    expect(source).toContain("consumedAt: new Date()");
  });

});
