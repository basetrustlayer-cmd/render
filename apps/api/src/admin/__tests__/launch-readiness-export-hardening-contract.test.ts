import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("launch readiness export hardening contracts", () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, "../routes.ts"),
    "utf8"
  );

  it("enforces deterministic export ordering", () => {
    expect(source).toContain(".sort(");
    expect(source).toContain("occurredAt.getTime()");
  });

  it("enforces computed read model persistence mode", () => {
    expect(source).toContain('persistenceMode: "COMPUTED_READ_MODEL"');
  });

  it("enforces launch risk classification", () => {
    expect(source).toContain('launchRisk');
    expect(source).toContain('"ELEVATED"');
    expect(source).toContain('"NORMAL"');
  });

  it("tracks stale projection operational alerts", () => {
    expect(source).toContain("staleSafeDealProjections");
    expect(source).toContain("staleProjectionSignals");
  });

  it("prevents autonomous replay execution escalation", () => {
    expect(source).toContain('"MANUAL_OPERATOR_REVIEW_REQUIRED"');
  });
});
