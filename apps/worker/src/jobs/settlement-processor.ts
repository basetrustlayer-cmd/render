import { Worker } from "bullmq";
import {
  createQueueConnection,
  RENDER_QUEUE_NAMES,
  type SettlementProjectionJobData
} from "@render/queue";
import { writeOperationalLog } from "@render/observability";

const connection = createQueueConnection();

export const settlementWorker =
  new Worker<SettlementProjectionJobData>(
    RENDER_QUEUE_NAMES.settlementProjection,
    async (job) => {
      const correlationId = `settlement_projection_${job.data.settlementId}`;

      writeOperationalLog({
        severity: "WARN",
        event: "settlement.projection.skipped_execution_boundary",
        message: "Render does not execute settlement release. TrustLayer owns settlement execution; Render keeps projection-only state.",
        correlationId,
        aggregateId: job.data.settlementId,
        source: "render.worker",
        metadata: {
          jobId: job.id,
          settlementId: job.data.settlementId,
          safeDealId: job.data.safeDealId,
          triggeredBy: job.data.triggeredBy,
          boundary: "TRUSTLAYER_OWNS_SETTLEMENT_EXECUTION"
        }
      });

      return {
        skipped: true,
        reason: "SETTLEMENT_EXECUTION_OWNED_BY_TRUSTLAYER",
        sync: "PENDING_TRUSTLAYER_WEBHOOK",
        processedAt: new Date().toISOString()
      };
    },
    { connection }
  );

settlementWorker.on("completed", (job) => {
  console.log(
    JSON.stringify({
      event: "settlement_projection_only_completed",
      jobId: job.id,
      settlementId: job.data.settlementId
    })
  );
});
