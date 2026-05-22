import { createTrustLayerClient } from "@render/trustlayer-sdk";
import { Worker } from "bullmq";
import {
  createQueueConnection,
  RENDER_QUEUE_NAMES,
  type SettlementProcessingJobData
} from "@render/queue";
import { prisma } from "../database.js";

const connection = createQueueConnection();

function getTrustLayerClient() {
  const apiKey = process.env.TRUSTLAYER_API_KEY;
  const baseUrl = process.env.TRUSTLAYER_API_URL;

  if (!apiKey || !baseUrl) {
    throw new Error("TrustLayer settlement credentials are required.");
  }

  return createTrustLayerClient({
    apiKey,
    baseUrl,
    maxRetries: 3,
    timeoutMs: 10_000
  });
}

export const settlementWorker =
  new Worker<SettlementProcessingJobData>(
    RENDER_QUEUE_NAMES.settlementProcessing,
    async (job) => {
      const settlement = await prisma.settlement.findUnique({
        where: { id: job.data.settlementId },
        include: { safeDeal: true }
      });

      if (!settlement) {
        throw new Error(`Settlement ${job.data.settlementId} not found.`);
      }

      if (settlement.safeDealId !== job.data.safeDealId) {
        throw new Error("Settlement does not belong to the provided Safe Deal.");
      }

      if (settlement.status !== "READY") {
        return {
          skipped: true,
          reason: `Settlement status is ${settlement.status}.`,
          processedAt: new Date().toISOString()
        };
      }

      if (!settlement.safeDeal.trustLayerEscrowId) {
        throw new Error("Safe Deal is missing TrustLayer escrow reference.");
      }

      await prisma.settlement.update({
        where: { id: settlement.id },
        data: {
          status: "PROCESSING",
          provider: "TRUSTLAYER"
        }
      });

      const trustLayer = getTrustLayerClient();

      const command = await trustLayer.releaseSettlement(
        {
          escrowId: settlement.safeDeal.trustLayerEscrowId,
          settlementId: settlement.id,
          safeDealId: settlement.safeDealId,
          amountGhs: Number(settlement.sellerReceivableAmount)
        },
        {
          correlationId: `settlement_${settlement.id}`,
          idempotencyKey: `settlement_release_${settlement.id}`
        }
      );

      return {
        ok: true,
        settlementId: settlement.id,
        trustLayer: command,
        sync: "PENDING_WEBHOOK",
        processedAt: new Date().toISOString()
      };
    },
    { connection }
  );

settlementWorker.on("completed", (job) => {
  console.log(
    JSON.stringify({
      event: "settlement_processing_completed",
      jobId: job.id,
      settlementId: job.data.settlementId
    })
  );
});

settlementWorker.on("failed", (job, error) => {
  console.error(
    JSON.stringify({
      event: "settlement_processing_failed",
      jobId: job?.id,
      error: error.message
    })
  );
});
