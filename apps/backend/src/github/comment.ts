import { Octokit } from "@octokit/rest";

import type { GithubPullRequest } from "@/database/models/index.js";
import { getRedisLock } from "@/util/redis/index.js";

import { checkErrorStatus } from "./client";

async function getOrCreatePullRequestComment({
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
}) {
  const lock = await getRedisLock();
  await lock.acquire(pullRequest.id, async () => {
    await pullRequest.$query();
    if (pullRequest.commentId) {
      return pullRequest.commentId;
    }

    const { data } = await octokit.issues.createComment({
      owner,
      repo,
      issue_number: pullRequest.number,
      body,
    });
    await pullRequest
      .$clone()
      .$query()
      .patch({ commentId: String(data.id) });
    return null;
  });
}

export async function commentGithubPr({
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
}) {
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
        comment_id: Number.parseInt(commentId, 10),
        body,
      });
    }
  } catch (error: unknown) {
    if (checkErrorStatus(404, error)) {
      await pullRequest.$clone().$query().patch({ commentDeleted: true });
    } else {
      throw error;
    }
  }
}
