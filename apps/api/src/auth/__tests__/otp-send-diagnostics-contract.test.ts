import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const authRoutes = readFileSync(resolve(process.cwd(), "src/auth/routes.ts"), "utf8");

describe("otp send diagnostics contract", () => {
  it("handles OTP delivery failures without leaking provider internals as 500s", () => {
    expect(authRoutes).toContain("AUTH_OTP_SEND_FAILED");
    expect(authRoutes).toContain("Unable to send OTP right now.");
    expect(authRoutes).toContain("reply.code(503)");
  });

  it("keeps challenge persistence after successful delivery only", () => {
    expect(authRoutes.indexOf("await sendOtpSms")).toBeLessThan(
      authRoutes.indexOf("await prisma.otpChallenge.create")
    );
  });
});
