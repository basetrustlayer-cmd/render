import crypto from "node:crypto";
import { recordOperationalMetric, writeOperationalLog } from "@render/observability";
import { initApiSentry, captureApiException } from "./sentry.js";
import { buildApp } from "./app.js";
import { apiEnv } from "./env.js";

initApiSentry();

const runtimeCorrelationId = crypto.randomUUID();

try {
  const app = await buildApp();

  await app.listen({
    port: apiEnv.port,
    host: "0.0.0.0"
  });

  writeOperationalLog({
    severity: "INFO",
    event: "api.runtime.started",
    message: "Render API runtime started.",
    correlationId: runtimeCorrelationId,
    aggregateId: "render-api-runtime",
    source: "render.api",
    metadata: {
      port: apiEnv.port,
      environment: process.env.NODE_ENV ?? "development"
    }
  });

  recordOperationalMetric({
    name: "api.runtime.started",
    value: 1,
    unit: "count",
    correlationId: runtimeCorrelationId,
    aggregateId: "render-api-runtime",
    source: "render.api",
    metadata: {
      port: apiEnv.port,
      environment: process.env.NODE_ENV ?? "development"
    }
  });

  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.once(signal, async () => {
      writeOperationalLog({
        severity: "WARN",
        event: "api.runtime.shutdown",
        message: "Render API runtime shutdown requested.",
        correlationId: runtimeCorrelationId,
        aggregateId: "render-api-runtime",
        source: "render.api",
        metadata: {
          signal
        }
      });

      recordOperationalMetric({
        name: "api.runtime.shutdown",
        value: 1,
        unit: "count",
        correlationId: runtimeCorrelationId,
        aggregateId: "render-api-runtime",
        source: "render.api",
        metadata: {
          signal
        }
      });

      await app.close();
      process.exit(0);
    });
  }
} catch (error) {
  captureApiException(error, { runtime: "api", phase: "startup" });

  writeOperationalLog({
    severity: "CRITICAL",
    event: "api.runtime.startup_failed",
    message: error instanceof Error ? error.message : "Render API startup failed.",
    correlationId: runtimeCorrelationId,
    aggregateId: "render-api-runtime",
    source: "render.api",
    metadata: {
      environment: process.env.NODE_ENV ?? "development"
    }
  });

  throw error;
}
