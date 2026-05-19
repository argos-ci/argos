import type { Octokit } from "@octokit/rest";

import { commentGithubPr } from "@/github";
import { redisLock } from "@/util/redis";

import { getCommentBody } from "./comment";

/**
 * Post a GitHub comment on a pull request.
 */
export async function postGitHubComment(args: {
  githubPullRequestId: string;
  commit: string;
  octokit: Octokit;
  owner: string;
  repo: string;
}) {
  const { githubPullRequestId, commit, owner, repo, octokit } = args;

  // This operation is idempotent.
  await redisLock.coalesce(
    ["post-github-comment", githubPullRequestId, owner, repo, commit],
    async () => {
      const body = await getCommentBody({ commit });
      await commentGithubPr({
        owner,
        repo,
        body,
        octokit,
        pullRequestId: githubPullRequestId,
      });
    },
  );
}
