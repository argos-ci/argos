import { GithubPullRequest } from "@/database/models";
import { createModelJob } from "@/job-core";

import { processPullRequest } from "./pull-request";

export const job = createModelJob(
  "githubPullRequest",
  GithubPullRequest,
  async (pullRequest) => {
    await processPullRequest(pullRequest);
  },
);
