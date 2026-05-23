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

  it("returns auth-token-derived profile fields while persistence is pending", () => {
    expect(source).toContain("id: authUser.userId");
    expect(source).toContain("verificationLevel: authUser.verificationLevel");
    expect(source).toContain("isBusiness: authUser.isBusiness");
    expect(source).toContain("isSuspended: authUser.isSuspended");
  });

  it("keeps profile persistence explicitly pending", () => {
    expect(source).toContain("User profile persistence pending.");
    expect(source.match(/reply\.code\(501\)/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it("does not mutate Prisma user records from placeholder profile routes", () => {
    const profileSection = source.slice(
      source.indexOf('app.get("/me"'),
      source.indexOf('app.post("/auth/otp/send"')
    );

    expect(profileSection).not.toContain("prisma.user.update");
    expect(profileSection).not.toContain("prisma.user.upsert");
    expect(profileSection).not.toContain("trustLayer");
    expect(profileSection).not.toContain("createTrustLayerClient");
  });

  it("keeps TrustLayer identity authority out of profile placeholder routes", () => {
    expect(source).not.toContain("trustlayerUserId: authUser");
    expect(source).not.toContain("verificationLevel: parsed.data");
    expect(source).not.toContain("trustScore: parsed.data");
    expect(source).not.toContain("trustTier: parsed.data");
  });
});
