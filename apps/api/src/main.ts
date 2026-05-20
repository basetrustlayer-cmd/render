import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerAuthRoutes } from "./auth/routes.js";
import { registerMessagingRoutes } from "./messaging/routes.js";
import { registerReviewRoutes } from "./reviews/routes.js";
import { registerTrustScoreRoutes } from "./trustscore/routes.js";
import { registerSafeDealRoutes } from "./safe-deals/routes.js";
import { registerTrustLayerRoutes } from "./trustlayer/routes.js";
import { registerNotificationRoutes } from "./notifications/routes.js";
import { registerSearchRoutes } from "./search/routes.js";
import { registerListingRoutes } from "./listings/routes.js";

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });

await registerAuthRoutes(app);
await registerMessagingRoutes(app);
await registerReviewRoutes(app);
await registerTrustScoreRoutes(app);
await registerSafeDealRoutes(app);
await registerTrustLayerRoutes(app);
await registerNotificationRoutes(app);
await registerSearchRoutes(app);
await registerListingRoutes(app);

app.get("/health", async () => ({
  status: "ok",
  service: "render-api"
}));

app.get("/health/db", async () => ({
  status: "ok",
  service: "render-api",
  database: "configured"
}));

const port = Number(process.env.PORT ?? 4000);
const host = process.env.HOST ?? "0.0.0.0";

try {
  await app.listen({ port, host });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
