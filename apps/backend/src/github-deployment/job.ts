import { createJob } from "@/job-core";

import { syncGitHubDeployment } from "./sync";

export const githubDeploymentJob = createJob<string>(
  "githubDeployment",
  { perform: syncGitHubDeployment },
  { timeout: 25_000 },
);
