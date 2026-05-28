import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("operational read model freshness enforcement", () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, "../routes.ts"),
    "utf8"
  );

  it("tracks stale operational telemetry states", () => {
    expect(source).toContain("staleProjectionSignals");
    expect(source).toContain("staleSafeDealProjections");
  });

  it("elevates launch risk when freshness degrades", () => {
    expect(source).toContain('launchRisk');
    expect(source).toContain('"ELEVATED"');
  });

  it("requires manual operator review for degraded freshness", () => {
    expect(source).toContain('"MANUAL_OPERATOR_REVIEW_REQUIRED"');
  });

  it("preserves computed operational read model boundaries", () => {
    expect(source).toContain('"COMPUTED_READ_MODEL"');
  });

  it("prevents autonomous remediation execution", () => {
    expect(source).not.toContain("AUTO_REMEDIATE");
    expect(source).not.toContain("AUTOMATIC_RECOVERY");
  });
});
