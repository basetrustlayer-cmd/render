import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Render launch blocker map contract", () => {
  const doc = readFileSync(
    resolve(process.cwd(), "../../docs/launch/render-launch-blocker-map.md"),
    "utf8"
  );

  it("keeps Render launch scope marketplace-only", () => {
    expect(doc).toContain("Ghana classifieds marketplace powered by TrustLayer");
    expect(doc).toContain("TrustLayer owns payments");
  });

  it("keeps launch blockers focused on Render-owned surfaces", () => {
    expect(doc).toContain("Marketplace listing lifecycle hardening");
    expect(doc).toContain("Seller storefront/profile completion");
    expect(doc).toContain("Search and discovery readiness");
    expect(doc).toContain("Messaging buyer-seller flow readiness");
    expect(doc).toContain("Admin moderation controls");
  });

  it("removes financial authority from Render launch blockers", () => {
    expect(doc).toContain("Removed From Render Launch Blockers");
    expect(doc).toContain("Payment processor implementation");
    expect(doc).toContain("These belong to TrustLayer");
  });
});
