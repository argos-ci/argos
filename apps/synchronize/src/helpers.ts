import { Synchronization } from "@argos-ci/database/models";

import { job } from "./job.js";

export const synchronizeFromInstallationId = async (installationId: string) => {
  const synchronization = await Synchronization.query().insert({
    type: "installation",
    installationId,
    jobStatus: "pending",
  });

  await job.push(synchronization.id);
};

export const synchronizeFromUserId = async (userId: string) => {
  const synchronization = await Synchronization.query().insert({
    type: "user",
    userId,
    jobStatus: "pending",
  });

  await job.push(synchronization.id);
};
