import "../setup.js";

import { job as buildNotificationJob } from "@/build-notification/index.js";
import { job as buildJob } from "@/build/index.js";
import { job as ghPullRequestJob } from "@/github-pull-request/index.js";
import { createJobWorker } from "@/job-core/index.js";
import { job as synchronizeJob } from "@/synchronize/index.js";

createJobWorker(
  buildJob,
  synchronizeJob,
  buildNotificationJob,
  ghPullRequestJob,
);
