import { invariant } from "@argos/util/invariant";

import { OriginPullRequest } from "@/database/models";
import { UnretryableError } from "@/job-core";
import logger from "@/logger";
import { redisLock } from "@/util/redis";

import type { OriginApi } from "./api";
import { checkOriginErrorStatus } from "./error";

/**
 * Get the ID of the managed comment on the pull request, creating the comment
 * when it does not exist yet. Returns `null` when nothing else has to be done
 * (the comment was just created with the body, or was deleted on Origin).
 */
async function getOrCreatePullRequestComment(args: {
  owner: string;
  repo: string;
  body: string;
  api: OriginApi;
  pullRequestId: string;
}): Promise<string | null> {
  const { pullRequestId, api, owner, repo, body } = args;
  return redisLock.acquire(
    ["create-origin-pr-comment", pullRequestId],
    async () => {
      const pullRequest =
        await OriginPullRequest.query().findById(pullRequestId);

      invariant(pullRequest, "Pull request not found", UnretryableError);

      if (pullRequest.commentDeleted) {
        return null;
      }

      if (pullRequest.commentId) {
        return pullRequest.commentId;
      }

      const comment = await api.createPullRequestComment(
        { owner, repo },
        pullRequest.number,
        { body },
      );
      await OriginPullRequest.query()
        .findById(pullRequestId)
        .patch({ commentId: comment.id });
      return null;
    },
  );
}

/**
 * Post or update the managed Argos comment on an Origin pull request.
 */
export async function commentOriginPr(args: {
  owner: string;
  repo: string;
  body: string;
  api: OriginApi;
  pullRequestId: string;
}) {
  const { api, repo, owner, body, pullRequestId } = args;
  try {
    const commentId = await getOrCreatePullRequestComment(args);

    if (commentId) {
      await api.updatePullRequestComment({ owner, repo }, commentId, { body });
    }
  } catch (error: unknown) {
    // The comment is gone on Origin: remember it so it is never recreated.
    if (checkOriginErrorStatus(404, error)) {
      await OriginPullRequest.query()
        .findById(pullRequestId)
        .patch({ commentDeleted: true });
    } else if (checkOriginErrorStatus(403, error)) {
      logger.info({ error }, "Origin PR comment update forbidden (403)");
    } else {
      throw error;
    }
  }
}
