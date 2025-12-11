import { invariant } from "@argos/util/invariant";

import { BuildNotification } from "@/database/models";
import { createModelJob } from "@/job-core";
import { redisLock } from "@/util/redis";

import { processBuildNotification } from "./notifications";

export const job = createModelJob(
  "buildNotification",
  BuildNotification,
  async (buildNotification) => {
    await redisLock.acquire(
      ["build-notification-process", buildNotification.buildId],
      async () => {
        const latestBuildNotification = await BuildNotification.query()
          .select("id")
          .where("buildId", buildNotification.buildId)
          .orderBy("id", "desc")
          .first();

        invariant(
          latestBuildNotification,
          "Latest build notification not found",
        );

        // Process the build notification only if it is the latest one
        // This prevents processing stale notifications
        // that may have been created while the job was waiting for the lock.
        if (latestBuildNotification.id === buildNotification.id) {
          await processBuildNotification(buildNotification);
        }
      },
      { timeout: 20_000 },
    );
  },
  { timeout: 25_000 },
);
