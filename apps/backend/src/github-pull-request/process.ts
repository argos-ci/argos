import { GithubRepository } from "@/database/models";
import { GithubPullRequest } from "@/database/models/GithubPullRequest";
import { subscribePullRequestCreatorToAllBuilds } from "@/database/services/build-notification-subscription";
import {
  getGhAccountType,
  getOrCreateGhAccount,
} from "@/database/services/github";
import { getInstallationOctokit } from "@/github/client";
import logger from "@/logger";
import { publishBranchMedia } from "@/media/publish";

import { fetchPullRequest, parsePullRequestData } from "./remote";

/**
 * Fetch the pull request data from GitHub and update the database.
 */
export async function processPullRequest(pullRequest: GithubPullRequest) {
  const { githubRepository } = await pullRequest.$fetchGraph(
    "githubRepository.[repoInstallations.installation,githubAccount]",
  );

  const installation = GithubRepository.pickBestInstallation(githubRepository);

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
    owner: githubRepository.githubAccount.login,
    repo: githubRepository.name,
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

  const updatedPullRequest = await pullRequest
    .$clone()
    .$query()
    .patchAndFetch({
      ...parsePullRequestData(pullRequestData),
      creatorId: githubAccount.id,
    });

  await subscribePullRequestCreatorToAllBuilds(updatedPullRequest);

  // The head branch is only known now, which is what makes this the moment a
  // branch's drafts can find their pull request.
  await publishBranchMedia(updatedPullRequest);
}
