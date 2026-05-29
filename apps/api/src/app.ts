import crypto from "node:crypto";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import Fastify, { type FastifyInstance } from "fastify";
import rawBody from "fastify-raw-body";
import { registerAdminRoutes } from "./admin/routes.js";
import { registerAuthRoutes } from "./auth/routes.js";
import { registerListingRoutes } from "./listings/routes.js";
import { registerLeadRoutes } from "./leads/routes.js";
import { registerMessagingRoutes } from "./messaging/routes.js";
import { registerNotificationRoutes } from "./notifications/routes.js";
import { registerQueueRoutes } from "./queues/routes.js";
import { registerReviewRoutes } from "./reviews/routes.js";
import { registerSafeDealRoutes } from "./safe-deals/routes.js";
import { registerSearchRoutes } from "./search/routes.js";
import { registerTrustLayerRoutes } from "./trustlayer/routes.js";
import { registerTrustScoreRoutes } from "./trustscore/routes.js";
import { registerWebhookRoutes } from "./webhooks/routes.js";
import { apiEnv } from "./env.js";
import { elapsedMs, nowMs, recordOperationalMetric, writeOperationalLog } from "@render/observability";

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: true,
    genReqId: () => crypto.randomUUID()
  });

  const allowedOrigins = apiEnv.corsOrigins
    .map((origin) => origin.trim())
    .filter(Boolean);

  await app.register(helmet, {
    contentSecurityPolicy: false
  });

  await app.register(cors, {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      const isConfiguredOrigin = allowedOrigins.includes(origin);
      const isVercelPreview = /^https:\/\/[-a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*\.vercel\.app$/.test(origin);
      const isRenderDomain = origin === "https://render.com.gh" || origin === "https://www.render.com.gh";

      return callback(null, isConfiguredOrigin || isVercelPreview || isRenderDomain);
    },
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

  app.addHook("onRequest", async (request) => {
    request.headers["x-render-request-start-ms"] = String(nowMs());
  });

  app.addHook("onResponse", async (request, reply) => {
    const startedAt = Number(request.headers["x-render-request-start-ms"] ?? Date.now());
    const durationMs = elapsedMs(startedAt);
    const correlationId = request.id;

    recordOperationalMetric({
      name: "api.request.completed",
      value: durationMs,
      unit: "ms",
      correlationId,
      aggregateId: request.url,
      source: "render.api",
      metadata: {
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode
      }
    });
  });

  app.setErrorHandler((error, request, reply) => {
    app.log.error({
      err: error,
      method: request.method,
      url: request.url
    });

    writeOperationalLog({
      severity: "ERROR",
      event: "api.error",
      message: error instanceof Error ? error.message : "Unexpected API error.",
      correlationId: request.id,
      aggregateId: request.url,
      source: "render.api",
      metadata: {
        method: request.method,
        url: request.url
      }
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

  app.get("/health", async () => {
    return {
      service: "render-api",
      status: "ok"
    };
  });

  await registerAuthRoutes(app);
  await registerAdminRoutes(app);
  await registerListingRoutes(app);
  await registerLeadRoutes(app);
  await registerReviewRoutes(app);
  await registerMessagingRoutes(app);
  await registerSearchRoutes(app);
  await registerNotificationRoutes(app);
  await registerQueueRoutes(app);
  await registerSafeDealRoutes(app);
  await registerTrustLayerRoutes(app);
  await registerTrustScoreRoutes(app);
  await registerWebhookRoutes(app);

  return app;
}
