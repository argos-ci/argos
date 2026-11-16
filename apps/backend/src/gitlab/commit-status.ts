import { invariant } from "@argos/util/invariant";
import {
  GitbeakerRequestError,
  type CommitablePipelineStatus,
} from "@gitbeaker/rest";

import config from "@/config";
import type { Project } from "@/database/models";
import { getGitlabProjectUrl, type GitlabClient } from "@/gitlab";
import parentLogger from "@/logger";
import { sendNotification } from "@/notification";
import { redisLock } from "@/util/redis";
import { getRedisClient } from "@/util/redis/client";

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

/**
 * Claim the right to email the owners of `projectId` for the coming week.
 * Losing the key to a Redis flush only costs one extra email.
 */
async function claimStatusForbiddenNotification(
  projectId: string,
): Promise<boolean> {
  const client = await getRedisClient();
  const result = await client.set(
    `gitlab-status-forbidden-notified.${projectId}`,
    "1",
    { NX: true, EX: 7 * 24 * 60 * 60 },
  );
  return result === "OK";
}

/**
 * Email the account owners that GitLab refuses the commit statuses of
 * `project`. Statuses are set by background jobs, so without it nobody learns
 * why the Argos status is missing from their pipelines.
 *
 * A protected branch makes GitLab refuse the statuses of some branches and
 * accept the others, so a status that goes through doesn't end the incident.
 * Owners get at most one email a week instead, for as long as it lasts.
 */
export async function notifyGitLabStatusForbidden(input: {
  project: Project;
  branch: string;
}) {
  const { project, branch } = input;
  const { account, gitlabProject } = project;
  invariant(account, "account relation not loaded");
  invariant(gitlabProject, "gitlabProject relation not loaded");

  if (!(await claimStatusForbiddenNotification(project.id))) {
    return;
  }

  const ownerIds = await account.$getOwnerIds();
  await sendNotification({
    type: "gitlab_status_forbidden",
    data: {
      project: {
        name: project.name,
        url: new URL(
          `/${account.slug}/${project.name}`,
          config.get("server.url"),
        ).href,
      },
      gitlabProject: {
        path: gitlabProject.pathWithNamespace,
        url: getGitlabProjectUrl(gitlabProject),
      },
      branch,
      settingsURL: new URL(
        `/${account.slug}/settings/integrations#gitlab`,
        config.get("server.url"),
      ).href,
    },
    recipients: ownerIds,
  });
}
