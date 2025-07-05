import { BuildNotification } from "@/database/models/index.js";
import { createModelJob } from "@/job-core/index.js";
import { getRedisLock } from "@/util/redis/index.js";

import { processBuildNotification } from "./notifications.js";

export const job = createModelJob(
  "buildNotification",
  BuildNotification,
  async (buildNotification) => {
    const lock = await getRedisLock();
    await lock.acquire(
      ["build-notification-process", buildNotification.buildId],
      async () => {
        await processBuildNotification(buildNotification);
      },
      { timeout: 20_000 },
    );
  },
  { timeout: 25_000 },
);
