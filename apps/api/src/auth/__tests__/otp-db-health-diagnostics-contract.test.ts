import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const authRoutes = readFileSync(resolve(process.cwd(), "src/auth/routes.ts"), "utf8");

describe("otp db health diagnostics contract", () => {
  it("classifies OTP challenge database failures separately", () => {
    expect(authRoutes).toContain("AUTH_OTP_DB_FAILED");
    expect(authRoutes).toContain("OTP_DB_UNAVAILABLE");
    expect(authRoutes).toContain("Unable to prepare OTP request right now.");
    expect(authRoutes).toContain("otpChallenge");
  });
});
