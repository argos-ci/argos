import { truncate } from "@argos/util/string";
import { PartialModelObject } from "objection";

import { GithubPullRequest } from "@/database/models/GithubPullRequest";
import {
  checkOctokitErrorStatus,
  Octokit,
  RestEndpointMethodTypes,
} from "@/github/client";

type GitHubApiPullRequest =
  RestEndpointMethodTypes["pulls"]["get"]["response"]["data"];

/**
 * Fetch a pull request from GitHub.
 */
export async function fetchPullRequest(
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
    if (checkOctokitErrorStatus(404, error)) {
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
    // In GitHub we can have more than 255 characters for a title
    // but it's useless to display more in Argos
    title: truncate(data.title, 255),
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
