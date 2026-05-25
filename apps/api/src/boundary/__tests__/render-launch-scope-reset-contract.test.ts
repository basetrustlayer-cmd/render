import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Render launch scope reset contract", () => {
  const scopeDoc = readFileSync(
    resolve(process.cwd(), "../../docs/launch/render-launch-scope-reset.md"),
    "utf8"
  );

  it("classifies Render as marketplace only after financial boundary extraction", () => {
    expect(scopeDoc).toContain("Render is a Ghana classifieds marketplace powered by TrustLayer");
    expect(scopeDoc).toContain("TrustLayer owns those domains");
  });

  it("removes financial authority work from Render launch blockers", () => {
    expect(scopeDoc).toContain("payment processor implementation");
    expect(scopeDoc).toContain("payout execution");
    expect(scopeDoc).toContain("settlement retry engine");
    expect(scopeDoc).toContain("dispute adjudication engine");
    expect(scopeDoc).toContain("Those belong to TrustLayer");
  });

  it("keeps Render launch work focused on marketplace and projection surfaces", () => {
    expect(scopeDoc).toContain("Marketplace listings");
    expect(scopeDoc).toContain("Search and discovery");
    expect(scopeDoc).toContain("Messaging");
    expect(scopeDoc).toContain("Webhook projection synchronization from TrustLayer");
    expect(scopeDoc).toContain("Cached trust/verification display");
  });
});
