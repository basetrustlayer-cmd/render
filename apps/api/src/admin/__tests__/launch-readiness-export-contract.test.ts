import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("launch readiness export contract", () => {
  const source = readFileSync(resolve(process.cwd(), "src/admin/routes.ts"), "utf8");

  it("exposes a super-admin launch readiness export endpoint", () => {
    expect(source).toContain('app.get("/admin/operations/launch-readiness-export"');
    expect(source).toContain("requireSuperAdmin");
    expect(source).toContain("exportPayload");
  });

  it("exports computed read-model data only", () => {
    expect(source).toContain('exportFormat: "JSON"');
    expect(source).toContain('persistenceMode: "COMPUTED_READ_MODEL"');
    expect(source).toContain('sourceModels: ["auditLog", "webhookEvent", "safeDeal"]');
  });

  it("keeps export read-only and manually governed", () => {
    expect(source).not.toContain("autoRemediate");
    expect(source).not.toContain("selfHeal");
    expect(source).toContain("ADMIN_LAUNCH_READINESS_EXPORT_VIEWED");
    expect(source).toContain("MANUAL_OPERATOR_REVIEW_REQUIRED");
  });
});
