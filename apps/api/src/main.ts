import { buildApp } from "./app.js";
import { apiEnv } from "./env.js";

const app = await buildApp();

await app.listen({
  port: apiEnv.port,
  host: "0.0.0.0"
});
