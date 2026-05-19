import { invariant } from "@argos/util/invariant";

import { GithubRepository, type GithubAccount } from "@/database/models";
import { postGitHubComment } from "@/git-platform/github";
import { getInstallationOctokit, type Octokit } from "@/github";
import { createGhCommitStatus } from "@/github/commit-status";
import { UnretryableError } from "@/job-core";

import type { SendNotificationContext } from "../context";
import type { NotificationPayload } from "../notification";

export type SendGitHubNotificationContext = SendNotificationContext & {
  octokit: Octokit;
  githubAccount: GithubAccount;
  githubRepository: GithubRepository;
};

/**
 * Get a context for sending GitHub notifications.
 */
export async function getGitHubNotificationContext(
  ctx: SendNotificationContext,
): Promise<SendGitHubNotificationContext | null> {
  const { project } = ctx;

  const { githubRepository } = project;

  if (!githubRepository) {
    return null;
  }

  const { githubAccount } = githubRepository;

  invariant(githubAccount, "No github account found", UnretryableError);

  const installation = GithubRepository.pickBestInstallation(githubRepository);

  if (!installation) {
    return null;
  }

  const octokit = await getInstallationOctokit(installation);

  if (!octokit) {
    return null;
  }

  return { ...ctx, octokit, githubAccount, githubRepository };
}

/**
 * Post the GitHub comment notification comment.
 */
export async function postGitHubNotificationComment(
  ctx: SendGitHubNotificationContext,
) {
  const {
    build,
    compareScreenshotBucket,
    octokit,
    githubAccount,
    githubRepository,
  } = ctx;

  if (!build.githubPullRequestId) {
    return;
  }

  await postGitHubComment({
    githubPullRequestId: build.githubPullRequestId,
    commit: compareScreenshotBucket.commit,
    octokit,
    owner: githubAccount.login,
    repo: githubRepository.name,
  });
}

/**
 * Post the GitHub notification commit status.
 */
export async function postGitHubNotificationCommitStatus(
  ctx: SendGitHubNotificationContext,
  notification: NotificationPayload,
) {
  const { commit, octokit, githubAccount, githubRepository } = ctx;

  await createGhCommitStatus(octokit, {
    owner: githubAccount.login,
    repo: githubRepository.name,
    sha: commit,
    state: notification.github.state,
    target_url: notification.url,
    description: notification.description,
    context: notification.context,
  });
}
