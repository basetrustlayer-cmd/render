import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("financial boundary extraction contracts", () => {
  const adminRoutes = readFileSync(
    resolve(process.cwd(), "src/admin/routes.ts"),
    "utf8"
  );

  it("removes embedded settlement execution from Render", () => {
    expect(adminRoutes).not.toContain("approvePayout");
    expect(adminRoutes).not.toContain("markSettlementComplete");
    expect(adminRoutes).not.toContain("resolve/buyer-refund");
    expect(adminRoutes).not.toContain("resolve/seller-release");
  });

  it("keeps Render dispute handling projection-only", () => {
    expect(adminRoutes).toContain("RENDER_PROJECTION_ONLY");
    expect(adminRoutes).toContain("STATUS_CHANGED");
    expect(adminRoutes).not.toContain("createTrustLayerClient");
  });

  it("removes embedded financial persistence models", () => {
    expect(adminRoutes).not.toContain("prisma.settlement");
    expect(adminRoutes).not.toContain("escrowLedgerEntry");
  });
});
