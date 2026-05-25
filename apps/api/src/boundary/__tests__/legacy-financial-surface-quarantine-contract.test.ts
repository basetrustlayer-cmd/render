import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("legacy financial surface removal contract", () => {
  it("removes embedded settlement implementation from Render", () => {
    expect(
      existsSync(resolve(process.cwd(), "src/ledger/settlement.ts"))
    ).toBe(false);
  });

  it("removes embedded settlement tests from Render", () => {
    expect(
      existsSync(resolve(process.cwd(), "src/ledger/__tests__/settlement.test.ts"))
    ).toBe(false);
  });

  it("keeps Render free from embedded settlement authority", () => {
    const adminRoutes = readFileSync(
      resolve(process.cwd(), "src/admin/routes.ts"),
      "utf8"
    );

    expect(adminRoutes).not.toContain("prisma.settlement");
    expect(adminRoutes).not.toContain("escrowLedgerEntry");
    expect(adminRoutes).not.toContain("resolve/buyer-refund");
    expect(adminRoutes).not.toContain("resolve/seller-release");
  });
});
