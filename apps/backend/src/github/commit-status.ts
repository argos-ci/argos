import type { Octokit, RestEndpointMethodTypes } from "@octokit/rest";

import { checkOctokitErrorStatus } from "@/github";
import parentLogger from "@/logger";
import { redisLock } from "@/util/redis";

const logger = parentLogger.child({ module: "github/commit-status" });

/**
 * Create a GitHub commit status.
 */
export async function createGhCommitStatus(
  octokit: Octokit,
  params: RestEndpointMethodTypes["repos"]["createCommitStatus"]["parameters"] & {
    context: string;
  },
) {
  await redisLock.acquire(
    [
      "create-github-commit-status",
      params.owner,
      params.repo,
      params.sha,
      params.context,
    ],
    async () => {
      try {
        await octokit.repos.createCommitStatus(params);
      } catch (error) {
        // It happens if a push-force occurs before sending the notification, it is not considered as an error
        // No commit found for SHA: xxx
        if (checkOctokitErrorStatus(422, error)) {
          logger.info(
            {
              owner: params.owner,
              repo: params.repo,
              sha: params.sha,
              context: params.context,
              error,
            },
            "GitHub createCommitStatus validation failed (422)",
          );
          return;
        }

        // It happens if the repository is archived and read-only.
        if (checkOctokitErrorStatus(403, error)) {
          logger.info(
            {
              owner: params.owner,
              repo: params.repo,
              sha: params.sha,
              context: params.context,
              error,
            },
            "GitHub createCommitStatus forbidden (403)",
          );
          return;
        }

        throw error;
      }
    },
  );
}
