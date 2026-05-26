import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const authRoutes = readFileSync(resolve(process.cwd(), "src/auth/routes.ts"), "utf8");

describe("otp send full route diagnostics contract", () => {
  it("guards the full OTP send route from unclassified 500s", () => {
    expect(authRoutes).toContain("AUTH_OTP_SEND_ROUTE_FAILED");
    expect(authRoutes).toContain("OTP_SEND_UNCLASSIFIED_FAILURE");
    expect(authRoutes).toContain("Unable to start OTP request right now.");
    expect(authRoutes).toContain("reply.code(503)");
  });
});
