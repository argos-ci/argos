import { GithubSynchronization } from "@/database/models";

import { job } from "./job";

export const synchronizeFromInstallationId = async (installationId: string) => {
  const synchronization = await GithubSynchronization.query().insert({
    githubInstallationId: installationId,
    jobStatus: "pending",
  });

  await job.push(synchronization.id);
};
