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

  it("keeps profile persistence explicitly pending", () => {
    expect(source).toContain("User profile persistence pending.");
    expect(source.match(/reply\.code\(501\)/g)?.length).toBeGreaterThanOrEqual(2);
  });
});
