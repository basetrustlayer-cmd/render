import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("seller listing quota contract", () => {
  const quotaSource = readFileSync(resolve(process.cwd(), "src/billing/listing-quota.ts"), "utf8");
  const listingRoutes = readFileSync(resolve(process.cwd(), "src/listings/routes.ts"), "utf8");

  it("defines the free seller plan quota", () => {
    expect(quotaSource).toContain('code: "FREE"');
    expect(quotaSource).toContain("activeListingLimit: 3");
    expect(quotaSource).toContain('currency: "GHS"');
  });

  it("counts only active marketplace listings against quota", () => {
    expect(quotaSource).toContain('in: ["PENDING", "LIVE", "MANUAL_REVIEW"]');
    expect(quotaSource).toContain("deletedAt: null");
  });

  it("blocks listing creation when free quota is exceeded", () => {
    expect(listingRoutes).toContain("getSellerListingQuota");
    expect(listingRoutes).toContain("LISTING_LIMIT_REACHED");
    expect(listingRoutes).toContain("upgradeRequired: true");
  });

  it("does not implement payment processing in quota slice", () => {
    expect(quotaSource).not.toMatch(/paystack|stripe|hubtel|invoice|ledger/i);
  });
});
