import type { GithubPullRequest } from "@/database/models/GithubPullRequest.js";
import {
  getGhAccountType,
  getOrCreateGhAccount,
} from "@/database/services/account.js";
import {
  checkErrorStatus,
  getInstallationOctokit,
  Octokit,
} from "@/github/client.js";
import { unretryable } from "@/job-core/error.js";
import logger from "@/logger/index.js";

/**
 * Fetches a pull request from GitHub.
 */
async function fetchPullRequest(
  octokit: Octokit,
  params: {
    owner: string;
    repo: string;
    pull_number: number;
  },
) {
  try {
    const { data } = await octokit.rest.pulls.get(params);
    return data;
  } catch (error) {
    if (checkErrorStatus(404, error)) {
      return null;
    }
    throw error;
  }
}

export async function processPullRequest(pullRequest: GithubPullRequest) {
  await pullRequest.$fetchGraph(
    "githubRepository.[activeInstallation,githubAccount]",
  );
  unretryable(
    pullRequest.githubRepository,
    "`githubRepository` relation not found",
  );

  unretryable(
    pullRequest.githubRepository.githubAccount,
    "`githubAccount` relation not found",
  );

  const installation = pullRequest.githubRepository.activeInstallation;

  if (!installation) {
    logger.info("No active installation found for repository", {
      githubRepositoryId: pullRequest.githubRepositoryId,
    });
    return;
  }

  const octokit = await getInstallationOctokit(installation.id);

  if (!octokit) {
    logger.info("Failed to get an Octokit for installation", {
      installationId: installation.id,
    });
    return;
  }

  const pullRequestData = await fetchPullRequest(octokit, {
    owner: pullRequest.githubRepository.githubAccount.login,
    repo: pullRequest.githubRepository.name,
    pull_number: pullRequest.number,
  });

  if (!pullRequestData) {
    return;
  }

  const githubAccount = await getOrCreateGhAccount({
    githubId: pullRequestData.user.id,
    login: pullRequestData.user.login,
    type: getGhAccountType(pullRequestData.user.type),
  });

  await pullRequest
    .$clone()
    .$query()
    .patch({
      title: pullRequestData.title,
      baseRef: pullRequestData.base.ref,
      baseSha: pullRequestData.base.sha,
      state: pullRequestData.state,
      date: pullRequestData.created_at,
      closedAt: pullRequestData.closed_at ?? null,
      mergedAt: pullRequestData.merged_at ?? null,
      merged: pullRequestData.merged,
      draft: pullRequestData.draft ?? false,
      creatorId: githubAccount.id,
    });
}
