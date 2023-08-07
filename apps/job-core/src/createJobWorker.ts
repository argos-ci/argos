import logger from "@argos-ci/logger";

import { getAmqpChannel } from "./amqp.js";
import type { Job } from "./createJob.js";

export async function createJobWorker(...jobs: Job<any>[]) {
  try {
    const channel = await getAmqpChannel();
    await Promise.all(
      jobs.map((job) => {
        logger.info(`Start consuming ${job.queue} queue`);
        return job.process({ channel });
      }),
    );
  } catch (error) {
    setTimeout(() => {
      throw error;
    });
  }
}
