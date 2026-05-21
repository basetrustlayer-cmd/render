import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import {
  createRenderQueue,
  RENDER_QUEUE_NAMES,
  type SmokeJobData
} from "@render/queue";

export async function registerQueueRoutes(app: FastifyInstance): Promise<void> {
  app.post("/queues/smoke", async (_request, reply) => {
    const queue = createRenderQueue(RENDER_QUEUE_NAMES.smoke);

    const data: SmokeJobData = {
      requestedBy: "api",
      requestedAt: new Date().toISOString(),
      correlationId: randomUUID()
    };

    const job = await queue.add("smoke", data);

    await queue.close();

    return reply.code(202).send({
      queued: true,
      queue: RENDER_QUEUE_NAMES.smoke,
      jobId: job.id,
      correlationId: data.correlationId
    });
  });
}
