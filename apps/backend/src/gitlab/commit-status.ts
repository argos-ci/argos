import {
  GitbeakerRequestError,
  type CommitablePipelineStatus,
} from "@gitbeaker/rest";

import type { GitlabClient } from "@/gitlab";
import { redisLock } from "@/util/redis";

/**
 * GitLab only moves an in-flight status forward: `pending` to `running`, then
 * to a conclusion. Asking for `pending` again, or `running` again, is refused —
 * the status is in flight either way, only its description goes stale.
 */
const IN_FLIGHT_TRANSITION_ERROR =
  /^Cannot transition status via :(enqueue|run) from :(pending|running)\b/;

/**
 * Set the commit status on GitLab.
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
          IN_FLIGHT_TRANSITION_ERROR.test(error.message)
        ) {
          return;
        }

        throw error;
      }
    },
  );
}
