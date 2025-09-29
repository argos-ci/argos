import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";
import gqlTag from "graphql-tag";

import {
  Build,
  BuildReview,
  ScreenshotDiff,
  ScreenshotDiffReview,
} from "@/database/models/index.js";

import {
  IBaseBranchResolution,
  IBuildStatus,
  type IResolvers,
} from "../__generated__/resolver-types.js";
import type { Context } from "../context.js";
import { paginateResult } from "./PageInfo.js";

const { gql } = gqlTag;

export const typeDefs = gql`
  enum BuildType {
    "Build auto-approved"
    reference
    "Comparison build"
    check
    "No baseline build found"
    orphan
    "Build skipped, always green, no diff processed"
    skipped
  }

  enum BuildStatus {
    "reviewStatus: accepted"
    ACCEPTED
    "reviewStatus: rejected"
    REJECTED
    "conclusion: no-changes"
    NO_CHANGES
    "conclusion: changes-detected"
    CHANGES_DETECTED
    "job status: pending"
    PENDING
    "job status: progress"
    PROGRESS
    "job status: complete"
    ERROR
    "job status: aborted"
    ABORTED
    "job status: expired"
    EXPIRED
  }

  type BuildStats {
    total: Int!
    failure: Int!
    changed: Int!
    added: Int!
    removed: Int!
    unchanged: Int!
    retryFailure: Int!
    ignored: Int!
  }

  enum BuildMode {
    "Build is compared with a baseline found by analyzing Git history"
    ci
    "Build is compared with the latest approved build"
    monitoring
  }

  enum BaseBranchResolution {
    "Base branch specified by the user through the API / SDK"
    user
    "Base branch is resolved from the project settings"
    project
    "Base branch is resolved from the pull request"
    pullRequest
  }

  type Build implements Node {
    id: ID!
    "Creation date of the build"
    createdAt: DateTime!
    "Date when the build is finalized (all batches received)"
    finalizedAt: DateTime
    "Date when the build is concluded (all diffs processed)"
    concludedAt: DateTime
    "The screenshot diffs between the base screenshot bucket of the compare screenshot bucket"
    screenshotDiffs(after: Int!, first: Int!): ScreenshotDiffConnection!
    "The screenshot bucket that serves as base for comparison"
    baseScreenshotBucket: ScreenshotBucket
    "The base build that contains the base screenshot bucket"
    baseBuild: Build
    "Continuous number. It is incremented after each build"
    number: Int!
    "Review status, conclusion or job status"
    status: BuildStatus!
    "Build name"
    name: String!
    "Pull request number"
    prNumber: Int
    "Pull request"
    pullRequest: PullRequest
    "Build stats"
    stats: BuildStats
    "Build type"
    type: BuildType
    "Pull request head commit"
    prHeadCommit: String
    "Commit"
    commit: String!
    "Branch"
    branch: String
    "Parallel infos"
    parallel: BuildParallel
    "Mode"
    mode: BuildMode!
    "Aggregated metadata"
    metadata: BuildMetadata
    "Base branch used to resolve the base build"
    baseBranch: String
    "Base branch resolved from"
    baseBranchResolvedFrom: BaseBranchResolution
    "Effective build reviews"
    reviews: [BuildReview!]!
    "Previous approved diffs from a build with the same branch"
    branchApprovedDiffs: [ID!]!
  }

  type BuildMetadata {
    testReport: TestReport
  }

  type TestReport {
    status: TestReportStatus!
    stats: TestReportStats
  }

  type TestReportStats {
    startTime: DateTime
    duration: Int
  }

  enum TestReportStatus {
    passed
    failed
    timedout
    interrupted
  }

  type BuildParallel {
    total: Int!
    received: Int!
    nonce: String!
  }

  type BuildConnection implements Connection {
    pageInfo: PageInfo!
    edges: [Build!]!
  }
`;

const getCompareScreenshotBucket = async (ctx: Context, build: Build) => {
  const bucket = await ctx.loaders.ScreenshotBucket.load(
    build.compareScreenshotBucketId,
  );
  invariant(bucket, "bucket not found");
  return bucket;
};

export const resolvers: IResolvers = {
  Build: {
    screenshotDiffs: async (build, { first, after }) => {
      // If the build is not concluded, we don't want to return any diffs.
      if (!build.conclusion) {
        return paginateResult({
          result: { total: 0, results: [] },
          first,
          after,
        });
      }
      const result = await build
        .$relatedQuery("screenshotDiffs")
        .leftJoinRelated("[baseScreenshot, compareScreenshot]")
        .orderByRaw(ScreenshotDiff.sortDiffByStatus)
        .orderBy("screenshot_diffs.score", "desc", "last")
        .orderBy("screenshot_diffs.group", "asc", "last")
        .orderBy("compareScreenshot.name", "asc")
        .orderBy("baseScreenshot.name", "asc")
        .orderBy("screenshot_diffs.id", "asc")
        .range(after, after + first - 1);

      return paginateResult({ result, first, after });
    },
    baseScreenshotBucket: async (build, _args, ctx) => {
      if (!build.baseScreenshotBucketId) {
        return null;
      }
      return ctx.loaders.ScreenshotBucket.load(build.baseScreenshotBucketId);
    },
    baseBuild: async (build, _args, ctx) => {
      if (!build.baseScreenshotBucketId) {
        return null;
      }
      return ctx.loaders.BuildFromCompareScreenshotBucketId.load(
        build.baseScreenshotBucketId,
      );
    },
    status: async (build, _args, ctx) => {
      const status = await ctx.loaders.BuildAggregatedStatus.load(build);
      switch (status) {
        case "accepted":
          return IBuildStatus.Accepted;
        case "rejected":
          return IBuildStatus.Rejected;
        case "no-changes":
          return IBuildStatus.NoChanges;
        case "changes-detected":
          return IBuildStatus.ChangesDetected;
        case "pending":
          return IBuildStatus.Pending;
        case "progress":
          return IBuildStatus.Progress;
        case "aborted":
          return IBuildStatus.Aborted;
        case "expired":
          return IBuildStatus.Expired;
        case "error":
          return IBuildStatus.Error;
        default:
          assertNever(status);
      }
    },
    commit: async (build, _args, ctx) => {
      if (build.prHeadCommit) {
        return build.prHeadCommit;
      }
      const compareBucket = await getCompareScreenshotBucket(ctx, build);
      return compareBucket.commit;
    },
    branch: async (build, _args, ctx) => {
      const compareBucket = await getCompareScreenshotBucket(ctx, build);
      return compareBucket.branch || null;
    },
    pullRequest: async (build, _args, ctx) => {
      if (!build.githubPullRequestId) {
        return null;
      }
      return ctx.loaders.GithubPullRequest.load(build.githubPullRequestId);
    },
    parallel: (build) => {
      if (!build.totalBatch || !build.batchCount || !build.externalId) {
        return null;
      }
      return {
        total: build.totalBatch,
        received: build.batchCount,
        nonce: build.externalId,
      };
    },
    baseBranch: async (build, _args, ctx) => {
      if (build.baseBranch) {
        return build.baseBranch;
      }
      if (!build.baseScreenshotBucketId) {
        return null;
      }
      const baseScreenshotBucket = await ctx.loaders.ScreenshotBucket.load(
        build.baseScreenshotBucketId,
      );
      invariant(baseScreenshotBucket, "baseScreenshotBucket not found");
      return baseScreenshotBucket.branch;
    },
    baseBranchResolvedFrom: (build) => {
      switch (build.baseBranchResolvedFrom) {
        case "user":
          return IBaseBranchResolution.User;
        case "project":
          return IBaseBranchResolution.Project;
        case "pull-request":
          return IBaseBranchResolution.PullRequest;
        case null:
          return null;
        default:
          assertNever(build.baseBranchResolvedFrom);
      }
    },
    reviews: async (build, _args, ctx) => {
      return ctx.loaders.BuildUniqueReviews.load(build.id);
    },
    stats: async (build) => {
      const { stats } = build;
      if (!stats) {
        return null;
      }
      return {
        total: stats.total ?? 0,
        failure: stats.failure ?? 0,
        changed: stats.changed ?? 0,
        added: stats.added ?? 0,
        removed: stats.removed ?? 0,
        unchanged: stats.unchanged ?? 0,
        retryFailure: stats.retryFailure ?? 0,
        ignored: stats.ignored ?? 0,
      };
    },
    branchApprovedDiffs: async (build, _args, ctx) => {
      if (!ctx.auth) {
        return [];
      }

      const compareBucket = await getCompareScreenshotBucket(ctx, build);

      // If branch is not set, we cannot find previous approvals
      if (!compareBucket.branch) {
        return [];
      }

      const previousApprovals = await ScreenshotDiff.query()
        .select("screenshot_diffs.id")
        .joinRelated("compareScreenshot")
        .where("screenshot_diffs.buildId", build.id)
        .whereIn(
          "compareScreenshot.fileId",
          ScreenshotDiff.query()
            .joinRelated("compareScreenshot")
            .select("compareScreenshot.fileId")
            .whereIn(
              "screenshot_diffs.id",
              ScreenshotDiffReview.query()
                .select("screenshot_diff_reviews.screenshotDiffId")
                .where("screenshot_diff_reviews.state", "approved")
                .whereIn(
                  "screenshot_diff_reviews.buildReviewId",
                  BuildReview.query()
                    .select("build_reviews.id")
                    .where("build_reviews.userId", ctx.auth.user.id)
                    .whereIn(
                      "build_reviews.buildId",
                      Build.query()
                        .select("builds.id")
                        .joinRelated("compareScreenshotBucket")
                        .where("builds.createdAt", "<", build.createdAt)
                        .where("builds.mode", build.mode)
                        .where("builds.conclusion", "changes-detected")
                        .where(
                          "compareScreenshotBucket.name",
                          compareBucket.name,
                        )
                        .where(
                          "compareScreenshotBucket.branch",
                          compareBucket.branch,
                        ),
                    )
                    .orderBy("build_reviews.createdAt", "desc")
                    .limit(1),
                ),
            ),
        );

      return previousApprovals.map((diff) => diff.id);
    },
  },
};
