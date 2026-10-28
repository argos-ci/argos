import { invariant } from "@argos/util/invariant";

import { getGitlabClientForProject, type GitlabProjectClient } from "@/gitlab";
import { setGitLabCommitStatus } from "@/gitlab/commit-status";
import { UnretryableError } from "@/job-core";

import type { SendNotificationContext } from "../context";
import type { NotificationPayload } from "../notification";

export type SendGitLabNotificationContext = SendNotificationContext & {
  gitlab: GitlabProjectClient;
};

/**
 * Get a context for sending GitLab notifications.
 */
export async function getGitLabNotificationContext(
  ctx: SendNotificationContext,
): Promise<SendGitLabNotificationContext | null> {
  const { project } = ctx;

  const { gitlabProject, account } = project;

  invariant(account, "no account found", UnretryableError);

  if (!account.gitlabAccessToken || !gitlabProject) {
    return null;
  }

  const gitlab = await getGitlabClientForProject(account, gitlabProject, {
    mode: "headless",
  });

  if (!gitlab) {
    return null;
  }

  return { ...ctx, gitlab };
}

/**
 * Post the GitLab notification commit status.
 */
export async function postGitLabNotificationCommitStatus(
  ctx: SendGitLabNotificationContext,
  notification: NotificationPayload,
) {
  await setGitLabCommitStatus({
    ...ctx.gitlab,
    sha: ctx.commit,
    state: notification.gitlab.state,
    context: notification.context,
    targetUrl: notification.url,
    description: notification.description,
  });
}
