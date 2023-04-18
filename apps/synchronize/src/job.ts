import { GithubSynchronization } from "@argos-ci/database/models";
import { createModelJob } from "@argos-ci/job-core";

import { synchronizeInstallation } from "./synchronizer.js";

export const job = createModelJob(
  "synchronize",
  GithubSynchronization,
  async (synchronization) => {
    return synchronizeInstallation(synchronization.githubInstallationId);
  }
);
