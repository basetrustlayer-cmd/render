import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildDashboardListingsWhere, createDashboardListingsResponse } from "../dashboard-listings.js";

const listingRoutes = readFileSync(resolve(process.cwd(), "src/listings/routes.ts"), "utf8");
const authMiddleware = readFileSync(resolve(process.cwd(), "src/auth/middleware.ts"), "utf8");
const dashboardListingsParser = readFileSync(
  resolve(process.cwd(), "../../apps/web/lib/dashboard-listings.ts"),
  "utf8"
);
const dashboardListingsPage = readFileSync(
  resolve(process.cwd(), "../../apps/web/app/dashboard/listings/page.tsx"),
  "utf8"
);

describe("dashboard listings contracts", () => {
  it("keeps /listings/my authenticated before reading seller inventory", () => {
    expect(listingRoutes).toContain('app.get("/listings/my", { preHandler: authenticate }');
    expect(listingRoutes).toContain("buildDashboardListingsWhere({ sellerId: authUser.userId })");
  });

  it("scopes dashboard listings to the authenticated seller only", () => {
    const where = buildDashboardListingsWhere({
      sellerId: "seller-1",
      now: new Date("2026-06-06T00:00:00.000Z")
    });

    expect(where.sellerId).toBe("seller-1");
    expect(where).not.toHaveProperty("organizationId");
  });

  it("excludes deleted, expired, and listing-suspended inventory", () => {
    const now = new Date("2026-06-06T00:00:00.000Z");
    const where = buildDashboardListingsWhere({ sellerId: "seller-1", now });

    expect(where.deletedAt).toBeNull();
    expect(where.OR).toEqual([{ expiresAt: null }, { expiresAt: { gt: now } }]);
    expect(where.status.in).not.toContain("EXPIRED");
    expect(where.status.in).not.toContain("SUSPENDED");
  });

  it("blocks suspended sellers through auth and the dashboard listing relation", () => {
    const where = buildDashboardListingsWhere({ sellerId: "seller-1" });

    expect(where.seller).toEqual({ isSuspended: false });
    expect(authMiddleware).toContain("AUTH_SUSPENDED_USER_REJECTED");
  });

  it("returns a stable empty listings response for sellers with zero listings", () => {
    expect(createDashboardListingsResponse([])).toEqual({ listings: [] });
  });

  it("returns seller listing rows without changing the result shape", () => {
    const listing = { id: "listing-1", sellerId: "seller-1", title: "Camera" };

    expect(createDashboardListingsResponse([listing])).toEqual({ listings: [listing] });
  });

  it("keeps the dashboard UI graceful for unauthenticated and failed fetch states", () => {
    expect(dashboardListingsPage).toContain("Login required");
    expect(dashboardListingsPage).toContain("No listings yet");
    expect(dashboardListingsPage).toContain("Unable to load listings right now.");
    expect(dashboardListingsPage).toContain("Seller access blocked");
    expect(dashboardListingsPage).toContain('router.replace("/login")');
  });

  it("guards against malformed dashboard listing responses before rendering rows", () => {
    expect(dashboardListingsPage).toContain("parseDashboardListingsResponse(result)");
    expect(dashboardListingsParser).toContain("Array.isArray(value.listings)");
    expect(dashboardListingsPage).toContain('loadState === "ready" && listings.map');
  });
});
