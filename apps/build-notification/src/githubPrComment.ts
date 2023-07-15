import type { Octokit } from "@octokit/rest";

import type {
  BuildAggregatedStatus,
  PullRequest,
} from "@argos-ci/database/models";
import { getRedisLock } from "@argos-ci/web";

export const getBuildStatusLabel = (status: BuildAggregatedStatus): string => {
  switch (status) {
    case "accepted":
      return "👍 Changes approved";
    case "aborted":
      return "🙅 Build aborted";
    case "diffDetected":
      return "🧿 Changes detected";
    case "error":
      return "❌ An error happened";
    case "expired":
      return "💀 Build expired";
    case "pending":
      return "📭 Waiting for screenshots";
    case "progress":
      return "🚜 Diffing screenshots";
    case "rejected":
      return "👎 Changes rejected";
    case "stable":
      return "✅ No change detected";
    default:
      throw new Error("Unknown build status");
  }
};

const createPrComment = async ({
  body,
  number,
  octokit,
  owner,
  repo,
}: {
  body: string;
  number: number;
  octokit: Octokit;
  owner: string;
  repo: string;
}) => {
  return await octokit.issues.createComment({
    owner,
    repo,
    issue_number: number,
    body,
  });
};

const updatePrComment = async ({
  body,
  commentId,
  octokit,
  owner,
  repo,
}: {
  body: string;
  commentId: number;
  octokit: Octokit;
  owner: string;
  repo: string;
}) => {
  return octokit.issues.updateComment({
    owner,
    repo,
    comment_id: commentId,
    body,
  });
};

export const createOrUpdatePrComment = async ({
  githubAccountLogin,
  octokit,
  pullRequest,
  repositoryName,
  message,
}: {
  commit: string;
  githubAccountLogin: string;
  octokit: Octokit;
  pullRequest: PullRequest;
  repositoryName: string;
  message: string;
}) => {
  try {
    const lock = await getRedisLock();
    const commentId = await lock.acquire(pullRequest.id, async () => {
      if (pullRequest.commentId) return pullRequest.commentId;
      const { data } = await createPrComment({
        octokit,
        owner: githubAccountLogin,
        repo: repositoryName,
        number: pullRequest.number,
        body: message,
      });
      await pullRequest.$clone().$query().patch({ commentId: data.id });
      return;
    });

    if (commentId) {
      await updatePrComment({
        octokit,
        owner: githubAccountLogin,
        repo: repositoryName,
        commentId,
        body: message,
      });
    }
  } catch (error: any) {
    // ignore if comment has been deleted by a user
    if (error.status === 404) {
      return;
    } else {
      throw error;
    }
  }
};
