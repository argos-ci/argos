import { GithubSynchronization } from "@/database/models";
import { createModelJob } from "@/job-core";

import { synchronizeInstallation } from "./synchronizer";

export const job = createModelJob(
  "synchronize",
  GithubSynchronization,
  async (synchronization) => {
    return synchronizeInstallation(synchronization.githubInstallationId);
  },
);
