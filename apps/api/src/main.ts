import { initApiSentry, captureApiException } from "./sentry.js";
import { buildApp } from "./app.js";
import { apiEnv } from "./env.js";

initApiSentry();

try {
  const app = await buildApp();

  await app.listen({
  port: apiEnv.port,
    host: "0.0.0.0"
  });
} catch (error) {
  captureApiException(error, { runtime: "api", phase: "startup" });
  throw error;
}
