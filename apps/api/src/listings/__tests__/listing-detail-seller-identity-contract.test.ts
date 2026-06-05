import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("listing detail seller identity contract", () => {
  const source = readFileSync(
    resolve(process.cwd(), "src/listings/routes.ts"),
    "utf8"
  );

  it("does not expose seller phone or email on listing detail", () => {
    expect(source).not.toContain("listing.seller.phone ??");
    expect(source).not.toContain("listing.seller.email ??");
    expect(source).toContain("whatsappNumber: listing.seller.whatsappNumber");
  });

  it("keeps safe generic seller labels for public display", () => {
    expect(source).toContain("Verified Business Seller");
    expect(source).toContain("Verified Render Seller");
  });
});
