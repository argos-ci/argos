import {
  GitbeakerRequestError,
  type CommitablePipelineStatus,
} from "@gitbeaker/rest";

import type { GitlabClient } from "@/gitlab";
import { redisLock } from "@/util/redis";

/**
 * Set the commit status on GitLab.
 * Handle errors that occur if the status is already in "running" state.
 * Could happen if a build fails.
 */
export async function setGitLabCommitStatus(args: {
  client: GitlabClient;
  gitlabProjectId: number;
  sha: string;
  state: CommitablePipelineStatus;
  context: string;
  targetUrl: string;
  description: string;
}) {
  await redisLock.acquire(
    ["create-gitlab-commit-status", args.gitlabProjectId, args.sha],
    async () => {
      try {
        await args.client.Commits.editStatus(
          args.gitlabProjectId,
          args.sha,
          args.state,
          {
            context: args.context,
            targetUrl: args.targetUrl,
            description: args.description,
          },
        );
      } catch (error) {
        if (
          error instanceof GitbeakerRequestError &&
          error.message.startsWith(
            "Cannot transition status via :run from :running",
          )
        ) {
          // If the status is already running, we can safely ignore this error
          return;
        }

        throw error;
      }
    },
  );
}
