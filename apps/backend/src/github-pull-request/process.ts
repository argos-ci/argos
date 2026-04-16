import { GithubRepository } from "@/database/models";
import { GithubPullRequest } from "@/database/models/GithubPullRequest";
import {
  getGhAccountType,
  getOrCreateGhAccount,
} from "@/database/services/github";
import { getInstallationOctokit } from "@/github/client";
import { unretryable } from "@/job-core/error";
import logger from "@/logger";

import { fetchPullRequest, parsePullRequestData } from "./remote";

/**
 * Fetch the pull request data from GitHub and update the database.
 */
export async function processPullRequest(pullRequest: GithubPullRequest) {
  await pullRequest.$fetchGraph(
    "githubRepository.[repoInstallations.installation,githubAccount]",
  );

  unretryable(
    pullRequest.githubRepository,
    "`githubRepository` relation not found",
  );

  unretryable(
    pullRequest.githubRepository.githubAccount,
    "`githubAccount` relation not found",
  );

  const installation = GithubRepository.pickBestInstallation(
    pullRequest.githubRepository,
  );

  if (!installation) {
    logger.info(
      {
        githubRepositoryId: pullRequest.githubRepositoryId,
      },
      "No active installation found for repository",
    );
    return;
  }

  const octokit = await getInstallationOctokit(installation);

  if (!octokit) {
    logger.info(
      {
        installationId: installation.id,
      },
      "Failed to get an Octokit for installation",
    );
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
    fallbackEmail: pullRequestData.user.email ?? null,
  });

  await pullRequest
    .$clone()
    .$query()
    .patch({
      ...parsePullRequestData(pullRequestData),
      creatorId: githubAccount.id,
    });
}
