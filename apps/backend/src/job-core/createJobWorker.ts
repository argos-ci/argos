import type { Job } from "./createJob";

export async function createJobWorker(...jobs: Job<any>[]) {
  try {
    await Promise.all(
      jobs.map(async (job) => {
        return job.process();
      }),
    );
  } catch (error) {
    // Shutdown after 1s to be sure logger is flushed
    setTimeout(() => {
      throw error;
    }, 1000);
  }
}
