import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const apiAdminRoutes = readFileSync(resolve(process.cwd(), "src/admin/routes.ts"), "utf8");
const apiAuthRoutes = readFileSync(resolve(process.cwd(), "src/auth/routes.ts"), "utf8");
const listingPage = readFileSync(resolve(process.cwd(), "../../apps/web/app/listings/[id]/page.tsx"), "utf8");
const sellerPage = readFileSync(resolve(process.cwd(), "../../apps/web/app/sellers/[id]/page.tsx"), "utf8");
const adminUsersPage = readFileSync(resolve(process.cwd(), "../../apps/web/app/admin/users/page.tsx"), "utf8");

describe("trust freshness contract tightening", () => {
  it("keeps auth profile read model freshness-aware", () => {
    expect(apiAuthRoutes).toContain("updatedAt: true");
    expect(apiAuthRoutes).toContain("trustScore: true");
    expect(apiAuthRoutes).toContain("trustTier: true");
  });

  it("keeps admin user API trust surfaces freshness-aware", () => {
    expect(apiAdminRoutes).toContain("updatedAt: true");
    expect(apiAdminRoutes).toContain("trustScore: true");
    expect(apiAdminRoutes).toContain("trustTier: true");
  });

  it("keeps public and admin trust UI freshness-aware", () => {
    expect(listingPage).toContain("formatTrustSyncedAt");
    expect(listingPage).toContain("seller.trustLastSyncedAt");
    expect(sellerPage).toContain("formatTrustSyncedAt");
    expect(sellerPage).toContain("seller.trustLastSyncedAt");
    expect(adminUsersPage).toContain("formatTrustFreshness");
    expect(adminUsersPage).toContain("Trust data sync pending");
  });
});
