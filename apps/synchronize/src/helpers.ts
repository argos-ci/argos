import { GithubSynchronization } from "@argos-ci/database/models";

import { job } from "./job.js";

export const synchronizeFromInstallationId = async (installationId: string) => {
  const synchronization = await GithubSynchronization.query().insert({
    githubInstallationId: installationId,
    jobStatus: "pending",
  });

  await job.push(synchronization.id);
};
