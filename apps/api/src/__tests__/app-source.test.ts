import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("api app factory boundary", () => {
  const appSource = readFileSync(resolve(process.cwd(), "src/app.ts"), "utf8");
  const mainSource = readFileSync(resolve(process.cwd(), "src/main.ts"), "utf8");

  it("exports a reusable Fastify app factory", () => {
    expect(appSource).toContain("export async function buildApp()");
    expect(appSource).toContain("return app;");
  });

  it("keeps socket binding isolated in main.ts", () => {
    expect(mainSource).toContain("const app = await buildApp();");
    expect(mainSource).toContain("await app.listen");
    expect(appSource).not.toContain("await app.listen");
  });

  it("records runtime startup and shutdown observability", () => {
    expect(mainSource).toContain('event: "api.runtime.started"');
    expect(mainSource).toContain('name: "api.runtime.started"');
    expect(mainSource).toContain('event: "api.runtime.shutdown"');
    expect(mainSource).toContain('name: "api.runtime.shutdown"');
  });

  it("keeps route registration inside the app factory", () => {
    expect(appSource).toContain("await registerAuthRoutes(app);");
    expect(appSource).toContain("await registerWebhookRoutes(app);");
    expect(appSource).toContain("await registerQueueRoutes(app);");
  });
});
