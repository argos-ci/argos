import { GithubSynchronization } from "@/database/models/index.js";

import { job } from "./job.js";

export const synchronizeFromInstallationId = async (installationId: string) => {
  const synchronization = await GithubSynchronization.query().insert({
    githubInstallationId: installationId,
    jobStatus: "pending",
  });

  await job.push(synchronization.id);
};
