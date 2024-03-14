import logger from "@/logger/index.js";

import type { Job } from "./createJob.js";

export async function createJobWorker(...jobs: Job<any>[]) {
  try {
    await Promise.all(
      jobs.map(async (job) => {
        logger.info(`Start consuming ${job.queue} queue`);
        return job.process();
      }),
    );
  } catch (error) {
    setTimeout(() => {
      throw error;
    });
  }
}
