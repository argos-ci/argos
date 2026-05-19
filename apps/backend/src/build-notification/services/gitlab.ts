import { invariant } from "@argos/util/invariant";
import type { Gitlab } from "@gitbeaker/rest";

import type { GitlabProject } from "@/database/models";
import { getGitlabClientFromAccount } from "@/gitlab";
import { setGitLabCommitStatus } from "@/gitlab/commit-status";
import { UnretryableError } from "@/job-core";

import type { SendNotificationContext } from "../context";
import type { NotificationPayload } from "../notification";

export type SendGitLabNotificationContext = SendNotificationContext & {
  gitlabClient: Gitlab<false>;
  gitlabProject: GitlabProject;
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

  const gitlabClient = await getGitlabClientFromAccount(account);

  if (!gitlabClient) {
    return null;
  }

  return { ...ctx, gitlabClient, gitlabProject };
}

/**
 * Post the GitLab notification commit status.
 */
export async function postGitLabNotificationCommitStatus(
  ctx: SendGitLabNotificationContext,
  notification: NotificationPayload,
) {
  const { gitlabClient, gitlabProject, commit } = ctx;
  await setGitLabCommitStatus({
    client: gitlabClient,
    gitlabProjectId: gitlabProject.gitlabId,
    sha: commit,
    state: notification.gitlab.state,
    context: notification.context,
    targetUrl: notification.url,
    description: notification.description,
  });
}
