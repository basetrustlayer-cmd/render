import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("launch readiness drift check contract", () => {
  const source = readFileSync(resolve(process.cwd(), "src/admin/routes.ts"), "utf8");

  it("keeps launch readiness surfaces computed and read-only", () => {
    expect(source).toContain('app.get("/admin/operations/slo-summary"');
    expect(source).toContain('app.get("/admin/operations/launch-readiness-history"');
    expect(source).toContain('app.get("/admin/operations/alerts"');
    expect(source).toContain('app.get("/admin/operations/alerts/timeline"');
    expect(source).toContain('app.get("/admin/operations/launch-dashboard"');
    expect(source).toContain('app.get("/admin/operations/launch-readiness-export"');
    expect(source).toContain('persistenceMode: "COMPUTED_READ_MODEL"');
  });

  it("prevents drift into autonomous remediation or financial authority", () => {
    expect(source).not.toContain("autoRemediate");
    expect(source).not.toContain("selfHeal");
    expect(source).not.toContain("releaseFunds");
    expect(source).not.toContain("settleLedger");
    expect(source).not.toContain("capturePayment");
  });

  it("preserves manual governance and TrustLayer boundary language", () => {
    expect(source).toContain("MANUAL_OPERATOR_REVIEW_REQUIRED");
    expect(source).toContain("OPERATIONAL_SLO_READ_MODEL");
    expect(source).toContain("sourceModels");
    expect(source).toContain("launchReadinessImpact");
  });
});
