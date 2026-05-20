import Fastify from "fastify";
import { registerAuthRoutes } from "./auth/routes.js";
import { registerListingRoutes } from "./listings/routes.js";
import { registerSafeDealRoutes } from "./safe-deals/routes.js";

const app = Fastify({
  logger: true
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

const port = Number(process.env.PORT || 3001);
const host = "0.0.0.0";

await app.listen({
  port,
  host
});
