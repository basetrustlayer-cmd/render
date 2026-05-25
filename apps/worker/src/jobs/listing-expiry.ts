import { Worker } from "bullmq";
import { prisma } from "../database.js";
import { captureWorkerException } from "../sentry.js";
import { createQueueConnection } from "@render/queue";

const connection = createQueueConnection();

export const listingExpiryWorker = new Worker(
  "render.listing.expiry",
  async () => {
    const result = await prisma.listing.updateMany({
      where: {
        status: "LIVE",
        deletedAt: null,
        expiresAt: {
          lte: new Date()
        }
      },
      data: {
        status: "EXPIRED"
      }
    });

    return {
      expiredCount: result.count,
      processedAt: new Date().toISOString()
    };
  },
  { connection }
);

listingExpiryWorker.on("failed", (job, error) => {
  captureWorkerException(error, {
    runtime: "worker",
    queue: "render.listing.expiry",
    jobId: job?.id
  });
});
