import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("safe deal route tenant and trust boundary contract", () => {
  const source = readFileSync(resolve(process.cwd(), "src/safe-deals/routes.ts"), "utf8");

  it("keeps all SafeDeal routes authenticated", () => {
    const routeCount = source.match(/app\.(get|post)\("/g)?.length ?? 0;
    const authenticatedRouteCount = source.match(/preHandler: authenticate/g)?.length ?? 0;

    expect(routeCount).toBe(6);
    expect(authenticatedRouteCount).toBe(6);
  });

  it("creates SafeDeals only from live listings in the requested organization context", () => {
    expect(source).toContain('status: "LIVE"');
    expect(source).toContain("organizationId: requestedOrganizationId ?? null");
  });

  it("scopes personal SafeDeal list queries by organization context and participant identity", () => {
    expect(source).toContain("organizationId: requestedOrganizationId ?? null");
    expect(source).toContain("{ buyerId: authUser.userId }");
    expect(source).toContain("{ sellerId: authUser.userId }");
  });

  it("scopes command mutations by organization context", () => {
    expect(source).toContain("organizationId: getRequestedOrganizationId(request) ?? null");
    expect(source).toContain("Only the buyer can confirm delivery.");
    expect(source).toContain("Only deal participants can dispute this Safe Deal.");
  });

  it("protects organization-scoped reads with active membership checks", () => {
    expect(source.match(/requireActiveOrganizationMembership/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
    expect(source).toContain('return reply.code(403).send({ error: "Invalid organization context." })');
  });

  it("keeps Render dispute risk signal explicitly non-authoritative", () => {
    expect(source).toContain("createRiskSignal");
    expect(source).toContain('boundary: "NON_AUTHORITATIVE_RENDER_SIGNAL"');
  });

  it("keeps TrustLayer as the SafeDeal command authority", () => {
    expect(source).toContain("createTrustLayerClient");
    expect(source).toContain("createSafeDealIntent");
    expect(source).toContain("confirmSafeDeal");
    expect(source).toContain("openSafeDealDispute");
    expect(source).toContain('sync: "PENDING_WEBHOOK"');
  });
});
