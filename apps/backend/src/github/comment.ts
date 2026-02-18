import { Octokit } from "@octokit/rest";

import type { GithubPullRequest } from "@/database/models";
import logger from "@/logger";
import { redisLock } from "@/util/redis";

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
  return redisLock.acquire(["create-pr-comment", pullRequest.id], async () => {
    const freshPR = await pullRequest.$query();
    if (freshPR.commentId) {
      return freshPR.commentId;
    }

    const { data } = await octokit.issues.createComment({
      owner,
      repo,
      issue_number: freshPR.number,
      body,
    });
    await freshPR.$query().patch({ commentId: String(data.id) });
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
    } else if (checkErrorStatus(403, error)) {
      logger.info({ error }, "GitHub PR comment update forbidden (403)");
    } else {
      console.error("Error while updating comment", error);
      throw error;
    }
  }
}
