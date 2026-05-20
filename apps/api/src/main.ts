import cors from "@fastify/cors";
import Fastify from "fastify";
import { registerAuthRoutes } from "./auth/routes.js";
import { registerListingRoutes } from "./listings/routes.js";
import { registerSafeDealRoutes } from "./safe-deals/routes.js";
import { registerTrustScoreRoutes } from "./trustscore/routes.js";

const app = Fastify({
  logger: true
});

const allowedOrigins = process.env.CORS_ORIGINS?.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean) ?? [];

await app.register(cors, {
  origin: allowedOrigins.length > 0 ? allowedOrigins : false,
  credentials: true
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

const port = Number(process.env.PORT || 3001);
const host = "0.0.0.0";

await app.listen({
  port,
  host
});
