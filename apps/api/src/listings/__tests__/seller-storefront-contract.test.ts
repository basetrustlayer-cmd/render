import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("seller storefront contract", () => {
  const source = readFileSync(
    resolve(process.cwd(), "src/listings/routes.ts"),
    "utf8"
  );

  it("does not expose only generic seller display names when phone or email exists", () => {
    expect(source).toContain("phone: true");
    expect(source).toContain("email: true");
    expect(source).toContain("seller.phone ??");
    expect(source).toContain("seller.email ??");
  });

  it("returns listing card fields for seller storefront active listings", () => {
    expect(source).toContain('app.get("/sellers/:id/listings"');
    expect(source).toContain("sellerId: true");
    expect(source).toContain("images: {");
    expect(source).toContain("url: true");
    expect(source).toContain("isCover: true");
    expect(source).toContain("seller: {");
    expect(source).toContain("verificationStatusCached: true");
    expect(source).toContain("trustScore: true");
    expect(source).toContain("trustTier: true");
  });
});
