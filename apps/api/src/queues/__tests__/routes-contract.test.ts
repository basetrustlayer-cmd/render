import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("queue route contract", () => {
  const source = readFileSync(resolve(process.cwd(), "src/queues/routes.ts"), "utf8");

  it("keeps smoke queue endpoint admin-only", () => {
    expect(source).toContain('app.post("/queues/smoke", { preHandler: [authenticate, requireAdmin] }');
  });

  it("requires authenticated actor context before enqueueing", () => {
    expect(source).toContain("const authUser = requireAuthUser(request)");
    expect(source.indexOf("const authUser = requireAuthUser(request)")).toBeLessThan(source.indexOf("const queue = createRenderQueue"));
  });

  it("uses the canonical smoke queue name and typed payload", () => {
    expect(source).toContain("RENDER_QUEUE_NAMES.smoke");
    expect(source).toContain("type SmokeJobData");
    expect(source).toContain('requestedBy: "api"');
  });

  it("generates a correlation id for the smoke job", () => {
    expect(source).toContain("randomUUID()");
    expect(source).toContain("correlationId: data.correlationId");
  });

  it("closes the queue after enqueueing", () => {
    expect(source).toContain('queue.add("smoke", data)');
    expect(source).toContain("await queue.close()");
    expect(source.indexOf('queue.add("smoke", data)')).toBeLessThan(source.indexOf("await queue.close()"));
  });

  it("audits smoke queue job enqueue events", () => {
    expect(source).toContain("QUEUE_SMOKE_JOB_ENQUEUED");
    expect(source).toContain('entityType: "QUEUE"');
    expect(source).toContain("entityId: String(job.id ?? \"\")");
  });

  it("returns accepted response with job and correlation identifiers", () => {
    expect(source).toContain("return reply.code(202).send");
    expect(source).toContain("queued: true");
    expect(source).toContain("jobId: job.id");
    expect(source).toContain("correlationId: data.correlationId");
  });
});
