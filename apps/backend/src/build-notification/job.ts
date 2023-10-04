import { BuildNotification } from "@/database/models/index.js";
import { createModelJob } from "@/job-core/index.js";

import { processBuildNotification } from "./notifications.js";

export const job = createModelJob(
  "buildNotification",
  BuildNotification,
  async (buildNotification) => {
    await processBuildNotification(buildNotification);
  },
);
