import type { Octokit, RestEndpointMethodTypes } from "@octokit/rest";

import { checkErrorStatus } from "@/github";
import { redisLock } from "@/util/redis";

/**
 * Create a GitHub commit status.
 */
export async function createGhCommitStatus(
  octokit: Octokit,
  params: RestEndpointMethodTypes["repos"]["createCommitStatus"]["parameters"],
) {
  await redisLock.acquire(
    ["create-github-commit-status", params.owner, params.repo, params.sha],
    async () => {
      try {
        await octokit.repos.createCommitStatus(params);
      } catch (error) {
        // It happens if a push-force occurs before sending the notification, it is not considered as an error
        // No commit found for SHA: xxx
        if (checkErrorStatus(422, error)) {
          return;
        }

        // It happens if the repository is archived and read-only.
        if (checkErrorStatus(403, error)) {
          return;
        }

        throw error;
      }
    },
  );
}
