import Fastify from "fastify";
import cors from "@fastify/cors";
import { prisma } from "./database/client.js";
import { registerAuthRoutes } from "./auth/routes.js";

const app = Fastify({
  logger: true
});

await app.register(cors, {
  origin: true
});

await registerAuthRoutes(app);

app.get("/health", async () => {
  return {
    status: "ok",
    service: "render-api"
  };
});

app.get("/health/db", async () => {
  await prisma.$queryRaw`SELECT 1`;

  return {
    status: "ok",
    service: "render-api",
    database: "connected"
  };
});

const port = Number(process.env.PORT ?? 4000);
const host = process.env.HOST ?? "0.0.0.0";

try {
  await app.listen({ port, host });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
