import { createTrustLayerClient } from "@render/trustlayer-sdk";
import { Worker } from "bullmq";
import {
  createQueueConnection,
  RENDER_QUEUE_NAMES,
  type SettlementProcessingJobData
} from "@render/queue";
import { prisma } from "../database.js";

const connection = createQueueConnection();
const MAX_SETTLEMENT_RETRIES = 5;

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

function calculateNextRetryAt(retryCount: number): Date {
  const delayMinutes = Math.min(60, 2 ** retryCount);
  return new Date(Date.now() + delayMinutes * 60 * 1000);
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

      if (settlement.status === "PAID" || settlement.status === "CANCELLED") {
        return {
          skipped: true,
          reason: `Settlement status is terminal: ${settlement.status}.`,
          processedAt: new Date().toISOString()
        };
      }

      if (settlement.status === "PROCESSING" && job.data.triggeredBy !== "retry_worker") {
        return {
          skipped: true,
          reason: "Settlement is already processing.",
          processedAt: new Date().toISOString()
        };
      }

      if (settlement.status === "FAILED" && settlement.retryCount >= MAX_SETTLEMENT_RETRIES) {
        return {
          skipped: true,
          reason: "Settlement retry limit reached.",
          retryCount: settlement.retryCount,
          processedAt: new Date().toISOString()
        };
      }

      if (settlement.status === "FAILED" && settlement.nextRetryAt && settlement.nextRetryAt > new Date()) {
        return {
          skipped: true,
          reason: "Settlement is not ready for retry.",
          nextRetryAt: settlement.nextRetryAt.toISOString(),
          processedAt: new Date().toISOString()
        };
      }

      if (!["READY", "FAILED", "PROCESSING"].includes(settlement.status)) {
        return {
          skipped: true,
          reason: `Settlement status is ${settlement.status}.`,
          processedAt: new Date().toISOString()
        };
      }

      if (!settlement.safeDeal.trustLayerEscrowId) {
        throw new Error("Safe Deal is missing TrustLayer escrow reference.");
      }

      const attemptCount = settlement.retryCount + 1;

      await prisma.settlement.update({
        where: { id: settlement.id },
        data: {
          status: "PROCESSING",
          provider: "TRUSTLAYER",
          retryCount: attemptCount,
          lastAttemptAt: new Date(),
          nextRetryAt: null,
          failureReason: null
        }
      });

      try {
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
          attemptCount,
          processedAt: new Date().toISOString()
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown TrustLayer settlement release failure.";

        await prisma.settlement.update({
          where: { id: settlement.id },
          data: {
            status: "FAILED",
            failureReason: message,
            nextRetryAt: calculateNextRetryAt(attemptCount)
          }
        });

        throw new Error(message);
      }
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
