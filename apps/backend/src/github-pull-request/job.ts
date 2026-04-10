import { GithubPullRequest } from "@/database/models";
import { createModelJob } from "@/job-core";

import { processPullRequest } from "./process";

export const githubPullRequestJob = createModelJob(
  "githubPullRequest",
  GithubPullRequest,
  async (pullRequest) => {
    await processPullRequest(pullRequest);
  },
);
