import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("api health route app-factory contract", () => {
  const appSource = readFileSync(resolve(process.cwd(), "src/app.ts"), "utf8");

  it("keeps the root health route inside buildApp", () => {
    expect(appSource).toContain('app.get("/", async () => {');
    expect(appSource).toContain('service: "render-api"');
    expect(appSource).toContain('status: "ok"');
  });

  it("does not bind network sockets inside the app factory", () => {
    expect(appSource).not.toContain("app.listen");
  });

  it("keeps operational response metrics registered in the app factory", () => {
    expect(appSource).toContain('name: "api.request.completed"');
    expect(appSource).toContain("recordOperationalMetric");
  });
});
