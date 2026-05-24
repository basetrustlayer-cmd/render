import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(process.cwd(), "../..");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);

    if (
      path.includes("node_modules") ||
      path.includes("/dist/") ||
      path.includes("/__tests__/") ||
      path.includes("/prisma/migrations/") ||
      path.endsWith(".tsbuildinfo")
    ) {
      return [];
    }

    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

describe("Render / TrustLayer authority boundary", () => {
  const runtimeFiles = [
    ...walk(join(ROOT, "apps")),
    ...walk(join(ROOT, "packages")),
    join(ROOT, ".env.example")
  ].filter((file) => /\.(ts|tsx|js|json|example)$/.test(file));

  const source = runtimeFiles
    .map((file) => readFileSync(file, "utf8"))
    .join("\n");

  it("does not contain active Paystack integration code", () => {
    expect(source).not.toMatch(/\bPAYSTACK\b/);
    expect(source).not.toMatch(/\bpaystack\b/i);
  });

  it("does not expose settlement release command execution from Render runtime", () => {
    expect(source).not.toContain("releaseSettlement");
    expect(source).not.toContain("settlement-release");
  });
});
