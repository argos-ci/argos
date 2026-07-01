import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";
import gqlTag from "graphql-tag";

import { getPreviousDiffApprovalIds } from "@/build/approval";
import {
  getBuildBaselineEligibility,
  type BuildBaselineIneligibilityReason,
} from "@/build/baselineEligibility";
import { getBuildImpactAnalysis } from "@/build/impact-analysis";
import { Build, BuildNotificationSubscription } from "@/database/models";
import { sortScreenshotDiffsForBuild } from "@/database/services/screenshot-diffs";
import { getProjectMemberIds } from "@/project/members";

import {
  IBaseBranchResolution,
  IBuildBaselineIneligibilityReason,
  IBuildStatus,
  type IResolvers,
} from "../__generated__/resolver-types";
import type { Context } from "../context";
import { paginateResult } from "./PageInfo";

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
    "Latest deployment matching the build commit"
    deployment: Deployment
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
    "Submitted build reviews"
    reviews: [BuildReview!]!
    "Whether the current user has already submitted a review on this build"
    viewerHasSubmittedReview: Boolean!
    "Comments visible to the current user (excludes other users' pending-review drafts)"
    comments: [Comment!]!
    "Previous approved diffs from a build with the same branch"
    branchApprovedDiffs: [ID!]!
    "Build is triggered in a merge queue"
    mergeQueue: Boolean!
    "Indicates whether this build contains only a subset of screenshots"
    subset: Boolean!
    "Whether the current user is subscribed to this build's notifications"
    subscribed: Boolean!
    "Users with access to this build's project (can be mentioned or requested as reviewers)"
    members: [User!]!
    "Users requested to review this build"
    reviewers: [User!]!
    "Whether this build is eligible to be used as a baseline by future builds"
    baselineEligibility: BuildBaselineEligibility!
    "Aggregated analysis of the visual changes, null until the build is concluded"
    impactAnalysis: BuildImpactAnalysis
    "Indicates whether the build contains Storybook screenshots"
    storybook: Boolean!
  }

  "Whether a build is eligible to be used as a baseline, with the reasons when it is not."
  type BuildBaselineEligibility {
    "Whether the build is eligible to be used as a baseline"
    eligible: Boolean!
    "Reasons why the build is not eligible (empty when eligible)"
    reasons: [BuildBaselineIneligibilityReason!]!
  }

  enum BuildBaselineIneligibilityReason {
    "The build is not complete yet"
    BUILD_INCOMPLETE
    "Some framework tests did not pass"
    TESTS_FAILED
    "The build is marked as a subset"
    SUBSET
    "The build has been rejected"
    REJECTED
    "The build is not auto-approved, manually approved, or an orphan"
    NOT_APPROVED
  }

  "An entity affected by visual changes in a build"
  type BuildImpactItem {
    name: String!
    "Number of changed screenshots in this entity"
    count: Int!
  }

  "The single most-changed entity of a build, with its diff score"
  type BuildImpactChange {
    name: String!
    "Diff score of the change, between 0 and 1"
    score: Float!
  }

  "Aggregated analysis of the visual changes of a build"
  type BuildImpactAnalysis {
    "Number of changed screenshots"
    changedCount: Int!
    "Number of unique changes, similar changes are grouped together"
    uniqueChangeCount: Int!
    "Distinct browsers among changed screenshots"
    changedBrowsers: [String!]!
    "Distinct browsers among all screenshots of the build"
    buildBrowsers: [String!]!
    "Distinct color schemes among changed screenshots"
    changedColorSchemes: [String!]!
    "Distinct color schemes among all screenshots of the build"
    buildColorSchemes: [String!]!
    "Distinct viewport sizes among changed screenshots, smallest first"
    changedViewports: [String!]!
    "Distinct viewport sizes among all screenshots of the build, smallest first"
    buildViewports: [String!]!
    "Distinct automation libraries (Storybook, Playwright…) used in the build"
    buildAutomationLibraries: [String!]!
    "The single most-changed entity, conveying the build's severity"
    largestChange: BuildImpactChange
    "Number of changed screenshots already approved on a previous build"
    previouslyApprovedCount: Int!
    "Storybook components affected by changes, most affected first"
    affectedComponents: [BuildImpactItem!]!
    "Storybook stories affected by changes, most affected first"
    affectedStories: [BuildImpactItem!]!
    "Tests affected by changes (end-to-end builds), most affected first"
    affectedTests: [BuildImpactItem!]!
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

async function getCompareScreenshotBucket(ctx: Context, build: Build) {
  const bucket = await ctx.loaders.ScreenshotBucket.load(
    build.compareScreenshotBucketId,
  );
  invariant(bucket, "bucket not found");
  return bucket;
}

async function getProject(ctx: Context, build: Build) {
  const project = await ctx.loaders.Project.load(build.projectId);
  invariant(project, "project not found");
  return project;
}

const baselineIneligibilityReasonMap: Record<
  BuildBaselineIneligibilityReason,
  IBuildBaselineIneligibilityReason
> = {
  "build-incomplete": IBuildBaselineIneligibilityReason.BuildIncomplete,
  "tests-failed": IBuildBaselineIneligibilityReason.TestsFailed,
  subset: IBuildBaselineIneligibilityReason.Subset,
  rejected: IBuildBaselineIneligibilityReason.Rejected,
  "not-approved": IBuildBaselineIneligibilityReason.NotApproved,
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
      const result = await sortScreenshotDiffsForBuild(
        build
          .$relatedQuery("screenshotDiffs")
          .leftJoinRelated("[baseScreenshot, compareScreenshot]"),
      ).range(after, after + first - 1);

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
    deployment: async (build, _args, ctx) => {
      const [compareBucket, project] = await Promise.all([
        getCompareScreenshotBucket(ctx, build),
        getProject(ctx, build),
      ]);
      if (!project.deploymentEnabled) {
        return null;
      }
      const commitShas: string[] = [compareBucket.commit];
      if (build.prHeadCommit) {
        commitShas.push(build.prHeadCommit);
      }
      return ctx.loaders.LatestDeploymentByProjectAndCommit.load({
        projectId: build.projectId,
        commitShas,
      });
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
      if (build.batchCount !== null && build.externalId !== null) {
        return {
          total: build.totalBatch ?? -1,
          received: build.batchCount,
          nonce: build.externalId,
        };
      }
      return null;
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
      return ctx.loaders.BuildReviews.load(build.id);
    },
    viewerHasSubmittedReview: async (build, _args, ctx) => {
      if (!ctx.auth) {
        return false;
      }
      // Reuse the batched, non-pending reviews already loaded for `reviews`
      // rather than issuing a separate count query.
      const userId = ctx.auth.user.id;
      const reviews = await ctx.loaders.BuildReviews.load(build.id);
      return reviews.some(
        (review) => review.userId === userId && !review.dismissedAt,
      );
    },
    comments: async (build, _args, ctx) => {
      return ctx.loaders.BuildPublishedComments.load({
        buildId: build.id,
        viewerUserId: ctx.auth?.user.id ?? null,
      });
    },
    stats: (build) => {
      return build.getStats();
    },
    branchApprovedDiffs: async (build, _args, ctx) => {
      if (!ctx.auth) {
        return [];
      }

      if (build.conclusion !== "changes-detected") {
        return [];
      }

      const compareBucket = await getCompareScreenshotBucket(ctx, build);

      // If branch is not set, we cannot find previous approvals
      if (!compareBucket.branch) {
        return [];
      }

      return getPreviousDiffApprovalIds({
        build,
        compareBucket,
        userId: ctx.auth.user.id,
      });
    },
    subscribed: async (build, _args, ctx) => {
      if (!ctx.auth) {
        return false;
      }
      const subscription = await BuildNotificationSubscription.query().findOne({
        buildId: build.id,
        userId: ctx.auth.user.id,
      });
      return subscription?.isSubscribed() ?? false;
    },
    impactAnalysis: async (build) => {
      if (!build.conclusion) {
        return null;
      }
      return getBuildImpactAnalysis(build);
    },
    storybook: async (build, _args, ctx) => {
      const compareBucket = await getCompareScreenshotBucket(ctx, build);
      return compareBucket.storybookScreenshotCount > 0;
    },
    members: async (build, _args, ctx) => {
      if (!ctx.auth) {
        return [];
      }
      const project = await ctx.loaders.Project.load(build.projectId);
      invariant(project, "Project not found");
      const userIds = await getProjectMemberIds(project);
      const accounts = await Promise.all(
        userIds.map((userId) =>
          ctx.loaders.AccountFromRelation.load({ userId }),
        ),
      );
      return accounts.filter((account) => account !== null);
    },
    reviewers: async (build, _args, ctx) => {
      if (!ctx.auth) {
        return [];
      }
      const requestedReviewers = await ctx.loaders.BuildRequestedReviewers.load(
        build.id,
      );
      const accounts = await Promise.all(
        requestedReviewers.map((reviewer) =>
          ctx.loaders.AccountFromRelation.load({ userId: reviewer.userId }),
        ),
      );
      return accounts.filter((account) => account !== null);
    },
    baselineEligibility: async (build, _args, ctx) => {
      const eligibility = await (async () => {
        // Until the build is complete, eligibility cannot be determined and we
        // can skip the extra loads.
        if (build.jobStatus !== "complete") {
          return getBuildBaselineEligibility({
            build,
            valid: false,
            rejected: false,
            hasAcceptedReview: false,
            hasMergedPullRequest: false,
          });
        }
        const [compareBucket, aggregatedStatus, pullRequest] =
          await Promise.all([
            ctx.loaders.ScreenshotBucket.load(build.compareScreenshotBucketId),
            ctx.loaders.BuildAggregatedStatus.load(build),
            build.githubPullRequestId
              ? ctx.loaders.GithubPullRequest.load(build.githubPullRequestId)
              : null,
          ]);
        return getBuildBaselineEligibility({
          build,
          valid: compareBucket?.valid ?? false,
          rejected: aggregatedStatus === "rejected",
          hasAcceptedReview: aggregatedStatus === "accepted",
          hasMergedPullRequest: pullRequest?.merged ?? false,
        });
      })();
      return {
        eligible: eligibility.eligible,
        reasons: eligibility.reasons.map(
          (reason) => baselineIneligibilityReasonMap[reason],
        ),
      };
    },
  },
};
