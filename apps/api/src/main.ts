import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import Fastify from "fastify";
import { registerAuthRoutes } from "./auth/routes.js";
import { registerListingRoutes } from "./listings/routes.js";
import { registerSafeDealRoutes } from "./safe-deals/routes.js";
import { registerTrustScoreRoutes } from "./trustscore/routes.js";
import { registerWebhookRoutes } from "./webhooks/routes.js";
import { apiEnv } from "./env.js";

const app = Fastify({
  logger: true
});

const allowedOrigins = apiEnv.corsOrigins
  .map((origin) => origin.trim())
  .filter(Boolean);

await app.register(cors, {
  origin: allowedOrigins.length > 0 ? allowedOrigins : false,
  credentials: true
});

await app.register(rateLimit, {
  global: true,
  max: 100,
  timeWindow: "1 minute"
});

app.get("/", async () => {
  return {
    service: "render-api",
    status: "ok"
  };
});

await registerAuthRoutes(app);
await registerListingRoutes(app);
await registerSafeDealRoutes(app);
await registerTrustScoreRoutes(app);
await registerWebhookRoutes(app);

const port = apiEnv.port;
const host = "0.0.0.0";

await app.listen({
  port,
  host
});
