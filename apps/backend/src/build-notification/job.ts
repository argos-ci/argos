import { BuildNotification } from "@/database/models";
import { createModelJob } from "@/job-core";

import { isLatestBuildNotification } from "./latest";
import { processBuildNotification } from "./notifications";

export const job = createModelJob(
  "buildNotification",
  BuildNotification,
  async (buildNotification) => {
    if (!(await isLatestBuildNotification(buildNotification))) {
      return;
    }

    await processBuildNotification(buildNotification);
  },
  { timeout: 25_000 },
);
