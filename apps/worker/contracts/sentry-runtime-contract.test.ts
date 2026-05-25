import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("worker Sentry runtime instrumentation contract", () => {
  const sentrySource = readFileSync(resolve(process.cwd(), "apps/worker/src/sentry.ts"), "utf8");
  const mainSource = readFileSync(resolve(process.cwd(), "apps/worker/src/main.ts"), "utf8");

  it("initializes worker Sentry only when SENTRY_DSN is configured", () => {
    expect(sentrySource).toContain("process.env.SENTRY_DSN");
    expect(sentrySource).toContain("Sentry.init");
  });

  it("captures worker job failures with queue and job context", () => {
    expect(mainSource).toContain("initWorkerSentry()");
    expect(mainSource).toContain("captureWorkerException(error");
    expect(mainSource).toContain("queue: job?.queueName");
    expect(mainSource).toContain("jobId: job?.id");
  });
});
