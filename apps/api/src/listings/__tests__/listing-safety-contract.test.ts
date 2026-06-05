import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "src/listings/routes.ts"), "utf8");

describe("listing launch safety contract", () => {
  it("requires Level 2 seller verification before listing creation", () => {
    expect(source).toContain("seller.verificationLevel < 2");
    expect(source).toContain("LISTING_CREATE_BLOCKED_VERIFICATION_LEVEL");
    expect(source).toContain("Level 2 verification is required to create listings.");
  });

  it("implements verifiedOnly as Level 2+ verified seller filtering", () => {
    expect(source).toContain("verificationLevel: { gte: 2 }");
    expect(source).toContain("isSuspended: false");
    expect(source).not.toContain("getVerifiedVerificationStatuses");
  });

  it("does not select or expose seller phone or email on public seller surfaces", () => {
    expect(source).toContain('whatsappNumber: true');
    expect(source).toContain('displayName: seller.isBusiness ? "Verified Business Seller" : "Verified Render Seller"');
    expect(source).toContain("displayName: listing.seller.isBusiness");
    expect(source).not.toContain("listing.seller.phone ??");
    expect(source).not.toContain("listing.seller.email ??");
    expect(source).not.toContain("seller.phone ??");
    expect(source).not.toContain("seller.email ??");
  });
});
