import { invariant } from "@argos/util/invariant";
import { Octokit } from "@octokit/rest";

import { GithubPullRequest } from "@/database/models";
import { UnretryableError } from "@/job-core";
import logger from "@/logger";
import { redisLock } from "@/util/redis";

import { checkOctokitErrorStatus } from "./error";

async function getOrCreatePullRequestComment(args: {
  owner: string;
  repo: string;
  body: string;
  octokit: Octokit;
  pullRequestId: string;
}) {
  const { pullRequestId, octokit, owner, repo, body } = args;
  return redisLock.acquire(["create-pr-comment", pullRequestId], async () => {
    const pullRequest = await GithubPullRequest.query().findById(pullRequestId);

    invariant(pullRequest, "Pull request not found", UnretryableError);

    if (pullRequest.commentDeleted) {
      return null;
    }

    if (pullRequest.commentId) {
      return pullRequest.commentId;
    }

    const { data } = await octokit.issues.createComment({
      owner,
      repo,
      issue_number: pullRequest.number,
      body,
    });
    await GithubPullRequest.query()
      .findById(pullRequestId)
      .patch({ commentId: String(data.id) });
    return null;
  });
}

export async function commentGithubPr(args: {
  owner: string;
  repo: string;
  body: string;
  octokit: Octokit;
  pullRequestId: string;
}) {
  const { octokit, repo, owner, body, pullRequestId } = args;
  try {
    const commentId = await getOrCreatePullRequestComment(args);

    if (commentId) {
      await octokit.issues.updateComment({
        owner,
        repo,
        comment_id: Number.parseInt(commentId, 10),
        body,
      });
    }
  } catch (error: unknown) {
    if (checkOctokitErrorStatus(404, error)) {
      await GithubPullRequest.query()
        .findById(pullRequestId)
        .patch({ commentDeleted: true });
    } else if (checkOctokitErrorStatus(403, error)) {
      logger.info({ error }, "GitHub PR comment update forbidden (403)");
    } else {
      console.error("Error while updating comment", error);
      throw error;
    }
  }
}
