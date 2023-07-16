import type { Octokit } from "@octokit/rest";

import { getRedisLock } from "@argos-ci/common";
import {
  Build,
  type BuildAggregatedStatus,
  PullRequest,
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

const dateFormatter = Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});
const formatDate = (date: string): string => {
  const d = new Date(date);
  return dateFormatter.format(d);
};

export const getGithubPrMessage = async ({
  commit,
}: {
  commit: string;
}): Promise<string> => {
  const builds = await Build.query()
    .distinctOn("builds.name")
    .joinRelated("compareScreenshotBucket")
    .where("compareScreenshotBucket.commit", commit)
    .orderBy([
      { column: "name", order: "desc" },
      { column: "builds.number", order: "desc" },
    ]);

  const aggregateStatuses = await Build.getAggregatedBuildStatuses(builds);
  const buildRows = await Promise.all(
    builds.map(async (build, index) => {
      const [stats, url] = await Promise.all([
        getStatsMessage(build.id),
        build.getUrl(),
      ]);
      const status = aggregateStatuses[index];
      if (!status) {
        throw new Error("Invariant: unknown build status");
      }
      const statusMessage = getBuildStatusLabel(status);
      const review = status === "diffDetected" ? ` ([Review](${url}))` : "";
      return `| **${
        build.name
      }** ([Inspect](${url})) | ${statusMessage}${review} | ${
        stats || "-"
      } | ${formatDate(build.updatedAt)} |`;
    })
  );
  return [
    `**The latest updates on your projects.** Learn more about [Argos for Git ↗︎](https://argos-ci.com/docs/)`,
    "",
    `| Build | Status | Details | Updated (UTC) |`,
    `| :---- | :----- | :------ | :------------ |`,
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
      if (pullRequest.commentId) {
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
