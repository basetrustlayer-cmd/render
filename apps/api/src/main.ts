import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import Fastify from "fastify";
import rawBody from "fastify-raw-body";
import { registerAuthRoutes } from "./auth/routes.js";
import { registerListingRoutes } from "./listings/routes.js";
import { registerQueueRoutes } from "./queues/routes.js";
import { registerSafeDealRoutes } from "./safe-deals/routes.js";
import { registerTrustLayerRoutes } from "./trustlayer/routes.js";
import { registerTrustScoreRoutes } from "./trustscore/routes.js";
import { registerWebhookRoutes } from "./webhooks/routes.js";
import { apiEnv } from "./env.js";

const app = Fastify({
  logger: true
});

const allowedOrigins = apiEnv.corsOrigins
  .map((origin) => origin.trim())
  .filter(Boolean);

await app.register(helmet, {
  contentSecurityPolicy: false
});

await app.register(cors, {
  origin: allowedOrigins.length > 0 ? allowedOrigins : false,
  credentials: true
});

await app.register(rateLimit, {
  global: true,
  max: 100,
  timeWindow: "1 minute"
});

await app.register(rawBody, {
  field: "rawBody",
  global: false,
  encoding: "utf8",
  runFirst: true
});

app.setErrorHandler((error, request, reply) => {
  app.log.error({
    err: error,
    method: request.method,
    url: request.url
  });

  const normalizedError =
    error instanceof Error ? error : new Error("Unexpected server error.");

  const maybeStatusError = normalizedError as Error & {
    statusCode?: number;
  };

  const statusCode = maybeStatusError.statusCode ?? 500;

  return reply.code(statusCode).send({
    error: statusCode >= 500 ? "Internal server error." : normalizedError.message
  });
});

app.get("/", async () => {
  return {
    service: "render-api",
    status: "ok"
  };
});

await registerAuthRoutes(app);
await registerListingRoutes(app);
await registerQueueRoutes(app);
await registerSafeDealRoutes(app);
await registerTrustLayerRoutes(app);
await registerTrustScoreRoutes(app);
await registerWebhookRoutes(app);

const port = apiEnv.port;
const host = "0.0.0.0";

await app.listen({
  port,
  host
});
