import { Worker } from "bullmq";
import {
  createQueueConnection,
  RENDER_QUEUE_NAMES,
  type SettlementProcessingJobData
} from "@render/queue";
import { prisma } from "../database.js";
import { createPaystackTransfer } from "../paystack.js";

const connection = createQueueConnection();

export const settlementWorker =
  new Worker<SettlementProcessingJobData>(
    RENDER_QUEUE_NAMES.settlementProcessing,
    async (job) => {
      console.log(
        JSON.stringify({
          event: "settlement_processing_started",
          jobId: job.id,
          safeDealId: job.data.safeDealId,
          settlementId: job.data.settlementId
        })
      );

      const settlement =
        await prisma.settlement.findUnique({
          where: { id: job.data.settlementId },
          include: {
            safeDeal: {
              include: {
                seller: {
                  select: {
                    payoutReady: true,
                    paystackRecipientCode: true
                  }
                }
              }
            }
          }
        });

      if (!settlement) {
        throw new Error(
          `Settlement ${job.data.settlementId} not found.`
        );
      }

      if (
        settlement.safeDealId !== job.data.safeDealId
      ) {
        throw new Error(
          "Settlement does not belong to the provided Safe Deal."
        );
      }

      if (settlement.status !== "READY") {
        return {
          skipped: true,
          reason: `Settlement status is ${settlement.status}.`,
          processedAt: new Date().toISOString()
        };
      }

      if (
        !settlement.safeDeal.seller.payoutReady ||
        !settlement.safeDeal.seller
          .paystackRecipientCode
      ) {
        const failed =
          await prisma.settlement.update({
            where: { id: settlement.id },
            data: {
              status: "FAILED",
              failureReason:
                "Seller payout setup is incomplete."
            }
          });

        return {
          ok: false,
          settlementId: failed.id,
          status: failed.status,
          reason: failed.failureReason,
          processedAt: new Date().toISOString()
        };
      }

      const transferReference = [
        "render",
        settlement.safeDealId,
        settlement.id
      ].join("-");

      await prisma.settlement.update({
        where: { id: settlement.id },
        data: {
          status: "PROCESSING",
          provider: "PAYSTACK"
        }
      });

      try {
        const payout =
          await createPaystackTransfer({
            amount: Number(
              settlement.sellerReceivableAmount
            ),
            recipient:
              settlement.safeDeal.seller
                .paystackRecipientCode,
            reference: transferReference,
            reason: `Safe Deal settlement ${settlement.safeDealId}`
          });

        const paidSettlement =
          await prisma.$transaction(
            async (tx) => {
              const updated =
                await tx.settlement.update({
                  where: { id: settlement.id },
                  data: {
                    status: "PAID",
                    providerReference:
                      payout.providerReference,
                    paidAt: new Date()
                  }
                });

              await tx.escrowLedgerEntry.upsert({
                where: {
                  idempotencyKey: `${settlement.safeDealId}:settlement_release`
                },
                update: {},
                create: {
                  safeDealId:
                    settlement.safeDealId,
                  entryType:
                    "SETTLEMENT_RELEASE",
                  amount:
                    settlement.sellerReceivableAmount,
                  idempotencyKey: `${settlement.safeDealId}:settlement_release`
                }
              });

              return updated;
            }
          );

        return {
          ok: true,
          settlementId: paidSettlement.id,
          status: paidSettlement.status,
          providerReference:
            paidSettlement.providerReference,
          processedAt:
            new Date().toISOString()
        };
      } catch (error) {
        const failed =
          await prisma.settlement.update({
            where: { id: settlement.id },
            data: {
              status: "FAILED",
              failureReason:
                error instanceof Error
                  ? error.message
                  : "Unknown payout failure."
            }
          });

        throw new Error(
          failed.failureReason ??
            "Settlement payout failed."
        );
      }
    },
    { connection }
  );

settlementWorker.on("completed", (job) => {
  console.log(
    JSON.stringify({
      event:
        "settlement_processing_completed",
      jobId: job.id,
      settlementId:
        job.data.settlementId
    })
  );
});

settlementWorker.on(
  "failed",
  (job, error) => {
    console.error(
      JSON.stringify({
        event:
          "settlement_processing_failed",
        jobId: job?.id,
        error: error.message
      })
    );
  }
);
