import { invariant } from "@argos/util/invariant";
import type { Octokit, RestEndpointMethodTypes } from "@octokit/rest";

import { GithubPullRequest, GithubRepository } from "@/database/models";
import {
  checkErrorStatus,
  commentGithubPr,
  getInstallationOctokit,
} from "@/github";
import { UnretryableError } from "@/job-core";
import { redisLock } from "@/util/redis";

import { getCommentBody } from "../comment";
import type { SendNotificationContext } from "../context";

/**
 * Create a GitHub commit status.
 */
async function createGhCommitStatus(
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

        throw error;
      }
    },
  );
}

/**
 * Send a notification to GitHub.
 */
export async function sendGitHubNotification(ctx: SendNotificationContext) {
  const { build, notification, commit } = ctx;

  invariant(build, "No build found", UnretryableError);

  const { project, compareScreenshotBucket } = build;

  invariant(
    compareScreenshotBucket,
    "No compare screenshot bucket found",
    UnretryableError,
  );

  invariant(project, "No project found", UnretryableError);

  const { githubRepository } = project;

  if (!githubRepository) {
    return;
  }

  const githubAccount = githubRepository.githubAccount;

  invariant(githubAccount, "No github account found", UnretryableError);

  const installation = GithubRepository.pickBestInstallation(githubRepository);

  if (!installation) {
    return;
  }

  const octokit = await getInstallationOctokit(installation);

  if (!octokit) {
    return;
  }

  const createGhComment = async () => {
    if (
      !ctx.comment ||
      !project.prCommentEnabled ||
      !build.githubPullRequestId
    ) {
      return;
    }

    const pullRequest = await GithubPullRequest.query().findById(
      build.githubPullRequestId,
    );

    if (!pullRequest || pullRequest.commentDeleted) {
      return;
    }

    const body = await getCommentBody({
      commit: compareScreenshotBucket.commit,
    });

    await commentGithubPr({
      owner: githubAccount.login,
      repo: githubRepository.name,
      body,
      octokit,
      pullRequest,
    });
  };

  await createGhCommitStatus(octokit, {
    owner: githubAccount.login,
    repo: githubRepository.name,
    sha: commit,
    state: notification.github.state,
    target_url: ctx.buildUrl,
    description: notification.description,
    context: notification.context,
  });

  await createGhComment();

  if (ctx.aggregatedNotification) {
    await createGhCommitStatus(octokit, {
      owner: githubAccount.login,
      repo: githubRepository.name,
      sha: commit,
      state: ctx.aggregatedNotification.github.state,
      target_url: ctx.projectUrl,
      description: ctx.aggregatedNotification.description,
      context: ctx.aggregatedNotification.context,
    });
  }
}
