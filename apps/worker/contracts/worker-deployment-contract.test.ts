import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("worker deployment contract", () => {
  const rootPackage = JSON.parse(
    readFileSync(resolve(process.cwd(), "package.json"), "utf8")
  );

  const queueSource = readFileSync(
    resolve(process.cwd(), "packages/queue/src/index.ts"),
    "utf8"
  );

  const workerPackage = JSON.parse(
    readFileSync(resolve(process.cwd(), "apps/worker/package.json"), "utf8")
  );

  const runbook = readFileSync(
    resolve(process.cwd(), "docs/operations/worker-deployment.md"),
    "utf8"
  );

  it("exposes root-level worker deployment commands", () => {
    expect(rootPackage.scripts["worker:build"]).toBe(
      "pnpm --filter @render/worker build"
    );
    expect(rootPackage.scripts["worker:start"]).toBe(
      "pnpm --filter @render/worker start"
    );
    expect(rootPackage.scripts["worker:lint"]).toBe(
      "pnpm --filter @render/worker lint"
    );
    expect(rootPackage.scripts["worker:test"]).toBe(
      "pnpm --filter @render/worker test"
    );
  });

  it("keeps the worker as a separate deployable runtime", () => {
    expect(workerPackage.scripts.build).toContain("tsc");
    expect(workerPackage.scripts.start).toBe("node dist/main.js");
  });

  it("fails fast when REDIS_URL is missing", () => {
    expect(queueSource).toContain("process.env.REDIS_URL");
    expect(queueSource).toContain(
      'throw new Error("REDIS_URL is required for queue operations.")'
    );
  });

  it("documents worker deployment requirements", () => {
    expect(runbook).toContain("DATABASE_URL");
    expect(runbook).toContain("REDIS_URL");
    expect(runbook).toContain("pnpm worker:build");
    expect(runbook).toContain("pnpm worker:start");
    expect(runbook).toContain("worker_ready");
  });
});
