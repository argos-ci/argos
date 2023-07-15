import type { Octokit } from "@octokit/rest";

import { getRedisLock } from "@argos-ci/common";
import {
  Build,
  type BuildAggregatedStatus,
  PullRequest,
  ScreenshotBucket,
} from "@argos-ci/database/models";

import { getStatsMessage } from "./utils.js";

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

export const getGithubPrMessage = async ({
  commit,
}: {
  commit: string;
}): Promise<string> => {
  const builds = await ScreenshotBucket.relatedQuery<Build>("builds").where({
    commit,
  });
  const aggregateStatuses = await Build.getAggregatedBuildStatuses(builds);
  const buildRows = await Promise.all(
    builds.map(async (build, index) => {
      const [stats, url] = await Promise.all([
        getStatsMessage(build.id),
        build.getUrl(),
      ]);
      const statusMessage = getBuildStatusLabel(aggregateStatuses[index]!);
      return `| ${build.name} | ${statusMessage} | ${stats} | [Inspect](${url}) |`;
    })
  );
  return [
    `| Build name | Status | Details | Inspect |`,
    `| :--------- | :----- | :------ | :------ |`,
    ...buildRows.sort(),
  ].join("\n");
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

export const commentGithubPr = async ({
  githubAccountLogin,
  message,
  octokit,
  pullRequest,
  repositoryName,
}: {
  githubAccountLogin: string;
  message: string;
  octokit: Octokit;
  pullRequest: PullRequest;
  repositoryName: string;
}) => {
  try {
    const lock = await getRedisLock();
    const commentId = await lock.acquire(pullRequest.id, async () => {
      await pullRequest.$query();
      if (pullRequest?.commentId) {
        return pullRequest.commentId;
      }

      const { data } = await createPrComment({
        body: message,
        number: pullRequest.number,
        octokit,
        owner: githubAccountLogin,
        repo: repositoryName,
      });
      await pullRequest.$clone().$query().patch({ commentId: data.id });
      return null;
    });

    if (commentId) {
      await updatePrComment({
        body: message,
        commentId,
        octokit,
        owner: githubAccountLogin,
        repo: repositoryName,
      });
    }
  } catch (error: any) {
    if (error.status === 404) {
      await pullRequest.$clone().$query().patch({ commentDeleted: true });
    } else {
      throw error;
    }
  }
};
