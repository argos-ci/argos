import { invariant } from "@argos/util/invariant";

import { BuildNotification } from "@/database/models";
import { createModelJob } from "@/job-core";
import { redisLock } from "@/util/redis";

import { processBuildNotification } from "./notifications";

export const job = createModelJob(
  "buildNotification",
  BuildNotification,
  async (buildNotification) => {
    await redisLock.coalesce(
      ["build-notification-process", buildNotification.buildId],
      async () => {
        // Always process the latest notification for this build. Bailers'
        // notifications are captured by this query, so a single execution
        // covers the whole burst; the rerun loop catches any notification
        // enqueued while the task is running.
        const latestBuildNotification = await BuildNotification.query()
          .where("buildId", buildNotification.buildId)
          .orderBy("id", "desc")
          .first();

        invariant(
          latestBuildNotification,
          "Latest build notification not found",
        );

        await processBuildNotification(latestBuildNotification);
      },
      { timeout: 20_000 },
    );
  },
  { timeout: 25_000 },
);
