import { OriginPullRequest } from "@/database/models";
import { createModelJob } from "@/job-core";

import { processOriginPullRequest } from "./process";

export const originPullRequestJob = createModelJob(
  "originPullRequest",
  OriginPullRequest,
  async (pullRequest) => {
    await processOriginPullRequest(pullRequest);
  },
);
