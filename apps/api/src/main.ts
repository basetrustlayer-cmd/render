import { initApiSentry, captureApiException } from "./sentry.js";
import { buildApp } from "./app.js";
import { getApiEnv, validateLaunchRequiredEnv } from "./env.js";

initApiSentry();
validateLaunchRequiredEnv();

try {
  const app = await buildApp();

  await app.listen({
  port: getApiEnv().port,
    host: "0.0.0.0"
  });
} catch (error) {
  captureApiException(error, { runtime: "api", phase: "startup" });
  throw error;
}
