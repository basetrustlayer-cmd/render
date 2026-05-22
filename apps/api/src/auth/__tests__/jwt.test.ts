import { describe, expect, it } from "vitest";
import { signAccessToken, verifyAccessToken } from "../jwt.js";

describe("auth jwt", () => {
  it("signs and verifies access token payloads", () => {
    const token = signAccessToken({
      userId: "00000000-0000-0000-0000-000000000001",
      verificationLevel: 1,
      isBusiness: false,
      isSuspended: false,
      jti: "test-jti"
    });

    const payload = verifyAccessToken(token);

    expect(payload.userId).toBe("00000000-0000-0000-0000-000000000001");
    expect(payload.verificationLevel).toBe(1);
    expect(payload.jti).toBe("test-jti");
  });
});
