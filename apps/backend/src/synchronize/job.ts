import { GithubSynchronization } from "@/database/models/index.js";
import { createModelJob } from "@/job-core/index.js";

import { synchronizeInstallation } from "./synchronizer.js";

export const job = createModelJob(
  "synchronize",
  GithubSynchronization,
  async (synchronization) => {
    return synchronizeInstallation(synchronization.githubInstallationId);
  },
);
