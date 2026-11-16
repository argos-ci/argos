import {
  GitbeakerRequestError,
  type CommitablePipelineStatus,
} from "@gitbeaker/rest";

import type { GitlabClient } from "@/gitlab";
import parentLogger from "@/logger";
import { redisLock } from "@/util/redis";

const logger = parentLogger.child({ module: "gitlab/commit-status" });

/**
 * GitLab only moves an in-flight status forward: `pending` to `running`, then
 * to a conclusion. Asking for `pending` again, or `running` again, is refused —
 * the status is in flight either way, only its description goes stale.
 */
const IN_FLIGHT_TRANSITION_ERROR =
  /^Cannot transition status via :(enqueue|run) from :(pending|running)\b/;

/**
 * Set the commit status on GitLab.
 *
 * Resolves `false` when GitLab refuses it (403), which no retry fixes: the
 * user behind the token has less than the Developer role on the project, or
 * can't push or merge to the protected branch of the pipeline GitLab attaches
 * the status to.
 */
export async function setGitLabCommitStatus(args: {
  client: GitlabClient;
  gitlabProjectId: number;
  sha: string;
  state: CommitablePipelineStatus;
  context: string;
  targetUrl: string;
  description: string;
}): Promise<boolean> {
  return redisLock.acquire(
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
        return true;
      } catch (error) {
        if (error instanceof GitbeakerRequestError) {
          if (IN_FLIGHT_TRANSITION_ERROR.test(error.message)) {
            return true;
          }

          if (error.cause?.response.status === 403) {
            logger.info(
              {
                gitlabProjectId: args.gitlabProjectId,
                sha: args.sha,
                context: args.context,
                error,
              },
              "GitLab refused the commit status (403)",
            );
            return false;
          }
        }

        throw error;
      }
    },
  );
}
