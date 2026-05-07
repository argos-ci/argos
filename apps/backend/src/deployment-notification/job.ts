import { invariant } from "@argos/util/invariant";

import { DeploymentNotification } from "@/database/models";
import { createModelJob } from "@/job-core";
import { redisLock } from "@/util/redis";

import { processDeploymentNotification } from "./notifications";

export const job = createModelJob(
  "deploymentNotification",
  DeploymentNotification,
  async (deploymentNotification) => {
    await redisLock.acquire(
      ["deployment-notification-process", deploymentNotification.deploymentId],
      async () => {
        const latestDeploymentNotification =
          await DeploymentNotification.query()
            .select("id")
            .where("deploymentId", deploymentNotification.deploymentId)
            .orderBy("id", "desc")
            .first();

        invariant(
          latestDeploymentNotification,
          "Latest deployment notification not found",
        );

        if (latestDeploymentNotification.id === deploymentNotification.id) {
          await processDeploymentNotification(deploymentNotification);
        }
      },
      { timeout: 20_000 },
    );
  },
  { timeout: 25_000 },
);
