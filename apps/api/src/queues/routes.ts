import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import {
  createRenderQueue,
  RENDER_QUEUE_NAMES,
  type SmokeJobData
} from "@render/queue";
import { authenticate, requireAdmin, requireAuthUser } from "../auth/middleware.js";
import { writeAuditLog } from "../audit/log.js";

export async function registerQueueRoutes(app: FastifyInstance): Promise<void> {
  app.post("/queues/smoke", { preHandler: [authenticate, requireAdmin] }, async (request, reply) => {
    const authUser = requireAuthUser(request);
    const queue = createRenderQueue(RENDER_QUEUE_NAMES.smoke);

    const data: SmokeJobData = {
      requestedBy: "api",
      requestedAt: new Date().toISOString(),
      correlationId: randomUUID()
    };

    const job = await queue.add("smoke", data);
    await queue.close();

    void writeAuditLog({
      request,
      actorUserId: authUser.userId,
      action: "QUEUE_SMOKE_JOB_ENQUEUED",
      entityType: "QUEUE",
      entityId: String(job.id ?? ""),
      metadata: {
        queue: RENDER_QUEUE_NAMES.smoke,
        correlationId: data.correlationId
      }
    });

    return reply.code(202).send({
      queued: true,
      queue: RENDER_QUEUE_NAMES.smoke,
      jobId: job.id,
      correlationId: data.correlationId
    });
  });
}
