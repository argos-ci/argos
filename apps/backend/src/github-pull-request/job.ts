import { GithubPullRequest } from "@/database/models/index.js";
import { createModelJob } from "@/job-core/index.js";

import { processPullRequest } from "./pullRequest.js";

export const job = createModelJob(
  "githubPullRequest",
  GithubPullRequest,
  async (pullRequest) => {
    await processPullRequest(pullRequest);
  },
);
