import { invariant } from "@argos/util/invariant";
import { GitbeakerRequestError } from "@gitbeaker/rest";

import {
  getGitlabClientFromAccount,
  type GitlabClient,
} from "@/gitlab/index.js";
import { UnretryableError } from "@/job-core/index.js";
import { redisLock } from "@/util/redis/index.js";

import type { SendNotificationContext } from "../context.js";
import { NotificationPayload } from "../notification.js";

/**
 * Set the commit status on GitLab.
 * Handle errors that occur if the status is already in "running" state.
 * Could happen if a build fails.
 */
async function setGitLabCommitStatus(input: {
  client: GitlabClient;
  gitlabProjectId: number;
  sha: string;
  state: NotificationPayload["gitlab"]["state"];
  context: string;
  targetUrl: string;
  description: string;
}) {
  await redisLock.acquire(
    ["create-gitlab-commit-status", input.gitlabProjectId, input.sha],
    async () => {
      try {
        await input.client.Commits.editStatus(
          input.gitlabProjectId,
          input.sha,
          input.state,
          {
            context: input.context,
            targetUrl: input.targetUrl,
            description: input.description,
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
      }
    },
  );
}

/**
 * Send a notification to GitLab.
 */
export async function sendGitLabNotification(ctx: SendNotificationContext) {
  const { build, notification } = ctx;
  invariant(build, "no build found", UnretryableError);

  const { project, compareScreenshotBucket } = build;

  invariant(
    compareScreenshotBucket,
    "no compare screenshot bucket found",
    UnretryableError,
  );
  invariant(project, "no project found", UnretryableError);

  const { gitlabProject, account } = project;

  invariant(account, "no account found", UnretryableError);

  if (!account.gitlabAccessToken) {
    return;
  }

  if (!gitlabProject) {
    return;
  }

  const client = await getGitlabClientFromAccount(account);

  if (!client) {
    return;
  }

  await setGitLabCommitStatus({
    client,
    gitlabProjectId: gitlabProject.gitlabId,
    sha: ctx.commit,
    state: notification.gitlab.state,
    context: notification.context,
    targetUrl: ctx.buildUrl,
    description: notification.description,
  });

  if (ctx.aggregatedNotification) {
    await setGitLabCommitStatus({
      client,
      gitlabProjectId: gitlabProject.gitlabId,
      sha: ctx.commit,
      state: ctx.aggregatedNotification.gitlab.state,
      context: ctx.aggregatedNotification.context,
      targetUrl: ctx.projectUrl,
      description: ctx.aggregatedNotification.description,
    });
  }
}
