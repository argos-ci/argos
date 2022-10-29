import { BuildNotification } from "@argos-ci/database/models";
import { createModelJob } from "@argos-ci/job-core";

import { processBuildNotification } from "./notifications";

export const job = createModelJob(
  "buildNotification",
  BuildNotification,
  async (buildNotification) => {
    await processBuildNotification(buildNotification);
  }
);
