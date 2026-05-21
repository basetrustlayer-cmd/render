import { Worker } from "bullmq";
import {
  createQueueConnection,
  RENDER_QUEUE_NAMES,
  type SmokeJobData
} from "@render/queue";

const connection = createQueueConnection();

const smokeWorker = new Worker<SmokeJobData>(
  RENDER_QUEUE_NAMES.smoke,
  async (job) => {
    console.log(
      JSON.stringify({
        event: "smoke_job_processed",
        jobId: job.id,
        queue: job.queueName,
        data: job.data,
        processedAt: new Date().toISOString()
      })
    );

    return {
      ok: true,
      processedAt: new Date().toISOString()
    };
  },
  { connection }
);

smokeWorker.on("ready", () => {
  console.log(
    JSON.stringify({
      event: "worker_ready",
      queues: [RENDER_QUEUE_NAMES.smoke]
    })
  );
});

smokeWorker.on("completed", (job) => {
  console.log(
    JSON.stringify({
      event: "job_completed",
      queue: job.queueName,
      jobId: job.id
    })
  );
});

smokeWorker.on("failed", (job, error) => {
  console.error(
    JSON.stringify({
      event: "job_failed",
      queue: job?.queueName,
      jobId: job?.id,
      error: error.message
    })
  );
});

async function shutdown(signal: string): Promise<void> {
  console.log(JSON.stringify({ event: "worker_shutdown_started", signal }));

  await smokeWorker.close();
  await connection.quit();

  console.log(JSON.stringify({ event: "worker_shutdown_complete", signal }));
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
