import { PartialModelObject } from "objection";

import { GithubPullRequest } from "@/database/models/GithubPullRequest.js";
import { GithubRepository } from "@/database/models/index.js";
import {
  getGhAccountType,
  getOrCreateGhAccount,
} from "@/database/services/account.js";
import {
  checkErrorStatus,
  getInstallationOctokit,
  Octokit,
  RestEndpointMethodTypes,
} from "@/github/client.js";
import { unretryable } from "@/job-core/error.js";
import logger from "@/logger/index.js";

type GitHubApiPullRequest =
  RestEndpointMethodTypes["pulls"]["get"]["response"]["data"];

/**
 * Fetch a pull request from GitHub.
 */
async function fetchPullRequest(
  octokit: Octokit,
  params: {
    owner: string;
    repo: string;
    pull_number: number;
  },
): Promise<GitHubApiPullRequest | null> {
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

/**
 * Parse the pull request data from GitHub.
 */
export function parsePullRequestData(data: {
  title: string;
  base: { ref: string; sha: string };
  state: "open" | "closed";
  created_at: string;
  closed_at: string | null;
  merged_at: string | null;
  merged?: boolean | null;
  draft?: boolean;
}) {
  return {
    title: data.title,
    baseRef: data.base.ref,
    baseSha: data.base.sha,
    state: data.state,
    date: data.created_at,
    closedAt: data.closed_at ?? null,
    mergedAt: data.merged_at ?? null,
    merged: data.merged ?? false,
    draft: data.draft ?? false,
  } satisfies PartialModelObject<GithubPullRequest>;
}

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
      ...parsePullRequestData(pullRequestData),
      creatorId: githubAccount.id,
    });
}
