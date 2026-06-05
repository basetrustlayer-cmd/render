import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "src/listings/routes.ts"), "utf8");

describe("seller storefront contract", () => {
  it("uses generic seller display names instead of phone or email", () => {
    expect(source).toContain('displayName: seller.isBusiness ? "Verified Business Seller" : "Verified Render Seller"');
    expect(source).not.toContain("seller.phone ??");
    expect(source).not.toContain("seller.email ??");
  });

  it("exposes public trust and marketplace summary metadata", () => {
    expect(source).toContain("verificationLevel: seller.verificationLevel");
    expect(source).toContain('verificationStatus: seller.verificationStatusCached ?? "Verification Pending"');
    expect(source).toContain("reviewCount: seller._count.reviewsReceived");
    expect(source).toContain("safeDealRequestCount: seller._count.sales");
    expect(source).toContain("activeListings: seller._count.listings");
    expect(source).toContain("memberSince: seller.createdAt");
  });
});
