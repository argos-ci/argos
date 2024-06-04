import type { Octokit } from "@octokit/rest";

import type { GithubPullRequest } from "@/database/models/index.js";
import { getRedisLock } from "@/util/redis/index.js";

const getOrCreatePullRequestComment = async ({
  owner,
  repo,
  body,
  octokit,
  pullRequest,
}: {
  owner: string;
  repo: string;
  body: string;
  octokit: Octokit;
  pullRequest: GithubPullRequest;
}) => {
  const lock = await getRedisLock();
  await lock.acquire(pullRequest.id, async () => {
    await pullRequest.$query();
    if (pullRequest.commentId) {
      return pullRequest.commentId;
    }

    await octokit.issues.createComment({
      owner,
      repo,
      issue_number: pullRequest.number,
      body,
    });
    // TODO: Uncomment this line when the database is updated
    //await pullRequest.$clone().$query().patch({ commentId: data.id });
    return null;
  });
};

export const commentGithubPr = async ({
  owner,
  repo,
  body,
  octokit,
  pullRequest,
}: {
  owner: string;
  repo: string;
  body: string;
  octokit: Octokit;
  pullRequest: GithubPullRequest;
}) => {
  try {
    const commentId =
      pullRequest.commentId ??
      (await getOrCreatePullRequestComment({
        owner,
        repo,
        body,
        octokit,
        pullRequest,
      }));

    if (commentId) {
      await octokit.issues.updateComment({
        owner,
        repo,
        comment_id: commentId,
        body,
      });
    }
  } catch (error: unknown) {
    if (error instanceof Error && "status" in error && error.status === 404) {
      await pullRequest.$clone().$query().patch({ commentDeleted: true });
    } else {
      throw error;
    }
  }
};
