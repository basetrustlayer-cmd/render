import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("TrustLayer verification route contract", () => {
  const source = readFileSync(resolve(process.cwd(), "src/trustlayer/routes.ts"), "utf8");

  it("keeps TrustLayer health public and non-mutating", () => {
    expect(source).toContain('app.get("/trustlayer/health", async () => {');
    expect(source).toContain('provider: "TrustLayer"');
    expect(source).toContain("configured: Boolean(process.env.TRUSTLAYER_API_KEY && process.env.TRUSTLAYER_API_URL)");
  });

  it("keeps verification status authenticated and read-only", () => {
    expect(source).toContain('app.get("/verify/status", { preHandler: authenticate }');
    expect(source).toContain("findUniqueOrThrow");
    expect(source).toContain("verificationLevel: true");
    expect(source).toContain("trustScore: true");
    expect(source).toContain("trustTier: true");
  });

  it("keeps Ghana Card verification authenticated and rate limited", () => {
    expect(source).toContain('app.post("/verify/ghana-card"');
    expect(source).toContain("preHandler: authenticate");
    expect(source).toContain("max: 5");
    expect(source).toContain('timeWindow: "1 hour"');
  });

  it("requires TrustLayer credentials before verification command execution", () => {
    expect(source).toContain("TRUSTLAYER_API_KEY");
    expect(source).toContain("TRUSTLAYER_API_URL");
    expect(source).toContain("TrustLayer verification credentials are required.");
    expect(source).toContain("createTrustLayerClient");
  });

  it("uses idempotent TrustLayer Ghana Card command metadata", () => {
    expect(source).toContain("verifyGhanaCard");
    expect(source).toContain("correlationId: request.id");
    expect(source).toContain("idempotencyKey: `ghana_card_${authUser.userId}_${parsed.data.ghanaCardNumber}`");
  });

  it("does not locally upgrade trust state until TrustLayer returns verified", () => {
    expect(source).toContain('verification.status !== "verified"');
    expect(source).toContain("GHANA_CARD_VERIFICATION_PENDING");
    expect(source).toContain("return reply.code(202).send");
  });

  it("updates local trust projection only after verified response", () => {
    expect(source).toContain("prisma.user.update");
    expect(source).toContain("verificationLevel: verification.verificationLevel ?? 2");
    expect(source).toContain("trustScore: verification.trustScore ?? 750");
    expect(source).toContain('trustTier: verification.trustTier ?? "VERIFIED"');
    expect(source).toContain("GHANA_CARD_VERIFIED");
  });
});
