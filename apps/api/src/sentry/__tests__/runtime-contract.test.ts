import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("API Sentry runtime instrumentation contract", () => {
  const sentrySource = readFileSync(resolve(process.cwd(), "src/sentry.ts"), "utf8");
  const mainSource = readFileSync(resolve(process.cwd(), "src/main.ts"), "utf8");

  it("initializes Sentry only when SENTRY_DSN is configured", () => {
    expect(sentrySource).toContain("process.env.SENTRY_DSN");
    expect(sentrySource).toContain("Sentry.init");
  });

  it("captures API startup failures with runtime context", () => {
    expect(mainSource).toContain("initApiSentry()");
    expect(mainSource).toContain("captureApiException(error");
    expect(mainSource).toContain('runtime: "api"');
  });
});
