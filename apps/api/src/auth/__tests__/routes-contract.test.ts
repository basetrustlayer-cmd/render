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
});
