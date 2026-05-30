import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("listing detail seller identity contract", () => {
  const source = readFileSync(
    resolve(process.cwd(), "src/listings/routes.ts"),
    "utf8"
  );

  it("uses seller phone or email before generic seller labels on listing detail", () => {
    expect(source).toContain("phone: true");
    expect(source).toContain("email: true");
    expect(source).toContain("listing.seller.phone ??");
    expect(source).toContain("listing.seller.email ??");
  });

  it("still keeps safe generic fallbacks when no public seller label exists", () => {
    expect(source).toContain("Verified Business Seller");
    expect(source).toContain("Verified Render Seller");
  });
});
