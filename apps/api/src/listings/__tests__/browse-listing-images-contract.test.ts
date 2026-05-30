import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("browse listings image contract", () => {
  const source = readFileSync(
    resolve(process.cwd(), "src/listings/routes.ts"),
    "utf8"
  );

  it("returns ordered listing images from the public browse endpoint", () => {
    expect(source).toContain('app.get("/listings", async (request, reply) => {');
    expect(source).toContain("images: {");
    expect(source).toContain('{ isCover: "desc" as const }');
    expect(source).toContain('{ sortOrder: "asc" as const }');
    expect(source).toContain("url: true");
    expect(source).toContain("isCover: true");
  });

  it("returns seller trust fields required by public listing cards", () => {
    expect(source).toContain("seller: {");
    expect(source).toContain("verificationStatusCached: true");
    expect(source).toContain("trustScore: true");
    expect(source).toContain("trustTier: true");
  });
});
