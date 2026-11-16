import { createJob } from "@/job-core";

import { syncGitHubDeployment } from "./sync";

/**
 * Keyed by deployment id. A job runs under a lock on its id, so the GitHub
 * deployment of a deployment is never created twice.
 */
export const githubDeploymentJob = createJob<string>("githubDeployment", {
  perform: syncGitHubDeployment,
});
