import type { BuildAggregatedStatus } from "@argos/schemas/build-status";
import type { BuildType } from "@argos/schemas/build-type";
import { invariant } from "@argos/util/invariant";

import { getApprovalEmoji, getBuildLabel } from "@/build/label";
import { getStatsMessage } from "@/build/stats";
import { getCommentHeader } from "@/database";
import {
  Build,
  BuildReview,
  Comment,
  Deployment,
  Project,
} from "@/database/models";

const dateFormatter = Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

function formatDate(date: string): string {
  const d = new Date(date);
  return dateFormatter.format(d);
}

/**
 * Get the name of the build.
 * If the build is associated with a project, the project name is prepended.
 */
function getBuildName(input: { build: Build; project: Project | null }) {
  if (input.project) {
    return `${input.project.name}/${input.build.name}`;
  }

  return input.build.name;
}

function getDeploymentName(input: {
  deployment: Deployment;
  project: Project | null;
}) {
  const name = input.deployment.environment;
  if (input.project) {
    return `${input.project.name}/${name}`;
  }

  return name;
}

function getDeploymentLabel(deployment: Deployment): string {
  switch (deployment.status) {
    case "pending":
      return "Deploying";
    case "ready":
      return "Ready";
    case "error":
      return "Failed";
    default:
      invariant(false, "Unknown deployment status");
  }
}

const reviewerListFormatter = new Intl.ListFormat("en-US", {
  style: "long",
  type: "conjunction",
});

/**
 * Who reviewed a build and how much discussion it drew, used to enrich the
 * status column of the PR comment.
 */
type BuildReviewSummary = {
  /** Display names of users whose latest active review approved the build. */
  approvedBy: string[];
  /** Display names of users whose latest active review rejected the build. */
  rejectedBy: string[];
  /** Number of comment threads (root comments) on the build. */
  commentCount: number;
};

function getOrCreateReviewSummary(
  summaries: Map<string, BuildReviewSummary>,
  buildId: string,
): BuildReviewSummary {
  let summary = summaries.get(buildId);
  if (!summary) {
    summary = { approvedBy: [], rejectedBy: [], commentCount: 0 };
    summaries.set(buildId, summary);
  }
  return summary;
}

/**
 * Build a review summary per build: the reviewers grouped by their latest active
 * decision and the number of comment threads. Mirrors the aggregation done in
 * {@link Build.getReviewStatuses} (latest review per user, dismissed reviews
 * ignored) so the names shown match the aggregated status.
 */
async function getBuildReviewSummaries(
  builds: Build[],
): Promise<Map<string, BuildReviewSummary>> {
  const summaries = new Map<string, BuildReviewSummary>();
  const buildIds = builds.map((build) => build.id);
  if (buildIds.length === 0) {
    return summaries;
  }

  const [reviews, commentCounts] = await Promise.all([
    BuildReview.query()
      .select(
        "build_reviews.buildId",
        "build_reviews.state",
        "build_reviews.dismissedAt",
        "accounts.name as reviewerName",
        "accounts.slug as reviewerSlug",
      )
      .distinctOn(["build_reviews.buildId", "build_reviews.userId"])
      .leftJoin("accounts", "accounts.userId", "build_reviews.userId")
      .whereIn("build_reviews.buildId", buildIds)
      .orderBy("build_reviews.buildId")
      .orderBy("build_reviews.userId")
      .orderBy("build_reviews.createdAt", "desc")
      .orderBy("build_reviews.id", "desc") as unknown as Promise<
      {
        buildId: string;
        state: BuildReview["state"];
        dismissedAt: string | null;
        reviewerName: string | null;
        reviewerSlug: string | null;
      }[]
    >,
    Comment.query()
      .select("buildId")
      .count("* as count")
      .whereIn("buildId", buildIds)
      .whereNull("deletedAt")
      // Only count thread roots so a discussion with replies stays "1 comment".
      .whereNull("threadId")
      .groupBy("buildId") as unknown as Promise<
      { buildId: string; count: string | number }[]
    >,
  ]);

  for (const review of reviews) {
    // The latest active review per user wins; a dismissed latest review means
    // the user no longer has an active decision.
    if (review.dismissedAt) {
      continue;
    }
    if (review.state !== "approved" && review.state !== "rejected") {
      continue;
    }
    const name = review.reviewerName || review.reviewerSlug;
    if (!name) {
      continue;
    }
    const summary = getOrCreateReviewSummary(summaries, review.buildId);
    const list =
      review.state === "approved" ? summary.approvedBy : summary.rejectedBy;
    list.push(name);
  }

  for (const { buildId, count } of commentCounts) {
    getOrCreateReviewSummary(summaries, buildId).commentCount = Number(count);
  }

  return summaries;
}

/**
 * Append the number of comment threads, e.g. " (3 comments)".
 */
function formatCommentCount(count: number): string {
  if (count <= 0) {
    return "";
  }
  return ` (${count} comment${count === 1 ? "" : "s"})`;
}

/**
 * Status label for the build, enriched with the reviewers when the build has
 * been approved or rejected, e.g. "👍 Approved by Alice and Bob (3 comments)".
 * Falls back to the plain {@link getBuildLabel} for every other status.
 */
function getReviewAwareBuildLabel(input: {
  type: BuildType | null;
  status: BuildAggregatedStatus;
  summary: BuildReviewSummary | undefined;
}): string {
  const { type, status, summary } = input;
  // Only "check" builds (and legacy builds with no type) carry reviews; other
  // types always resolve to a fixed label.
  if (type === "check" || type == null) {
    if (status === "accepted") {
      const label = formatReviewLabel("approved", summary?.approvedBy ?? []);
      return `${label}${formatCommentCount(summary?.commentCount ?? 0)}`;
    }
    if (status === "rejected") {
      const label = formatReviewLabel("rejected", summary?.rejectedBy ?? []);
      return `${label}${formatCommentCount(summary?.commentCount ?? 0)}`;
    }
  }
  return getBuildLabel(type, status);
}

function formatReviewLabel(
  state: "approved" | "rejected",
  names: string[],
): string {
  const emoji = getApprovalEmoji(state);
  const verb = state === "approved" ? "Approved" : "Rejected";
  if (names.length === 0) {
    return `${emoji} ${verb}`;
  }
  return `${emoji} ${verb} by ${reviewerListFormatter.format(names)}`;
}

function getBuildRows(input: {
  builds: Build[];
  hasMultipleProjects: boolean;
  aggregateStatuses: Awaited<
    ReturnType<typeof Build.getAggregatedBuildStatuses>
  >;
  reviewSummaries: Map<string, BuildReviewSummary>;
  urls: string[];
}) {
  return input.builds
    .filter((build) => {
      invariant(build.project, "Relation `project` should be fetched");
      return build.project.prCommentEnabled;
    })
    .map((build, index) => {
      invariant(build.project, "Relation `project` should be fetched");

      const url = input.urls[index];
      invariant(url, "missing build URL");

      const status = input.aggregateStatuses[index];
      invariant(status, "missing build status");

      const stats = build.stats
        ? getStatsMessage(build.stats, { isSubsetBuild: build.subset })
        : null;

      const label = getReviewAwareBuildLabel({
        type: build.type,
        status,
        summary: input.reviewSummaries.get(build.id),
      });
      const review =
        status === "changes-detected" && build.type !== "reference"
          ? ` ([Review](${url}))`
          : "";
      const name = getBuildName({
        build,
        project: input.hasMultipleProjects ? build.project : null,
      });

      return `| **${name}** ([Inspect](${url})) | ${label}${review} | ${
        stats || "-"
      } | ${formatDate(build.updatedAt)} |`;
    });
}

function getDeploymentRows(input: {
  deployments: Deployment[];
  hasMultipleProjects: boolean;
}) {
  return input.deployments
    .filter((deployment) => {
      invariant(deployment.project, "Relation `project` should be fetched");
      return deployment.project.prCommentEnabled;
    })
    .map((deployment) => {
      invariant(deployment.project, "Relation `project` should be fetched");

      const name = getDeploymentName({
        deployment,
        project: input.hasMultipleProjects ? deployment.project : null,
      });

      return `| **${name}** ([Open](${deployment.url})) | ${getDeploymentLabel(
        deployment,
      )} | ${deployment.branch} | ${formatDate(deployment.updatedAt)} |`;
    });
}

export async function getCommentBody(props: {
  commit: string;
}): Promise<string> {
  const { commit } = props;
  const [builds, deployments] = await Promise.all([
    Build.query()
      .distinctOn("builds.name", "builds.projectId")
      .joinRelated("compareScreenshotBucket")
      .withGraphFetched("project.account")
      .where("compareScreenshotBucket.commit", commit)
      .orderBy([
        { column: "builds.name", order: "desc" },
        { column: "builds.projectId", order: "desc" },
        { column: "builds.number", order: "desc" },
      ]),
    Deployment.query()
      .distinctOn("deployments.projectId", "deployments.environment")
      .withGraphFetched("project")
      .where("deployments.commitSha", commit)
      .orderBy([
        { column: "deployments.projectId", order: "desc" },
        { column: "deployments.environment", order: "desc" },
        { column: "deployments.createdAt", order: "desc" },
        { column: "deployments.id", order: "desc" },
      ]),
  ]);

  const hasMultipleProjects =
    new Set([
      ...builds.map((build) => build.projectId),
      ...deployments.map((deployment) => deployment.projectId),
    ]).size > 1;
  const [aggregateStatuses, urls, reviewSummaries] = await Promise.all([
    Build.getAggregatedBuildStatuses(builds),
    Promise.all(builds.map((build) => build.getUrl())),
    getBuildReviewSummaries(builds),
  ]);
  const buildRows = getBuildRows({
    builds,
    hasMultipleProjects,
    aggregateStatuses,
    reviewSummaries,
    urls,
  });
  const deploymentRows = getDeploymentRows({
    deployments,
    hasMultipleProjects,
  });
  const parts = [getCommentHeader()];

  if (buildRows.length > 0) {
    parts.push(
      "",
      "| Build | Status | Details | Updated (UTC) |",
      "| :---- | :----- | :------ | :------------ |",
      ...buildRows.sort(),
    );
  }

  if (deploymentRows.length > 0) {
    parts.push(
      "",
      "| Deployment | Status | Branch | Updated (UTC) |",
      "| :--------- | :----- | :----- | :------------ |",
      ...deploymentRows.sort(),
    );
  }

  return parts.join("\n");
}
