import gqlTag from "graphql-tag";

import { pushBuildNotification } from "@argos-ci/build-notification";
import { Build, ScreenshotDiff } from "@argos-ci/database/models";

import type {
  IBuildStatus,
  IResolvers,
} from "../__generated__/resolver-types.js";
import type { Context } from "../context.js";
import { APIError, unauthenticated } from "../util.js";
import { paginateResult } from "./PageInfo.js";

const { gql } = gqlTag;

export const typeDefs = gql`
  enum BuildType {
    "Build on reference branch"
    reference
    "Comparison build"
    check
    "No reference build to compare"
    orphan
  }

  enum BuildStatus {
    "reviewStatus: accepted"
    accepted
    "reviewStatus: rejected"
    rejected
    "conclusion: stable"
    stable
    "conclusion: diffDetected"
    diffDetected
    "job status: pending"
    pending
    "job status: progress"
    progress
    "job status: complete"
    error
    "job status: aborted"
    aborted
    "job status: expired"
    expired
  }

  type BuildStats {
    total: Int!
    failure: Int!
    changed: Int!
    added: Int!
    removed: Int!
    unchanged: Int!
  }

  type Build implements Node {
    id: ID!
    createdAt: DateTime!
    updatedAt: DateTime!
    "The screenshot diffs between the base screenshot bucket of the compare screenshot bucket"
    screenshotDiffs(after: Int!, first: Int!): ScreenshotDiffConnection!
    "The screenshot bucket of the baselineBranch"
    baseScreenshotBucket: ScreenshotBucket
    "Continuous number. It is incremented after each build"
    number: Int!
    "Review status, conclusion or job status"
    status: BuildStatus!
    "Build name"
    name: String!
    "Pull request number"
    prNumber: Int
    "Build stats"
    stats: BuildStats!
    "Build type"
    type: BuildType
    "Received batch count "
    batchCount: Int
    "Expected batch count"
    totalBatch: Int
    "Pull request head commit"
    prHeadCommit: String
    "Commit"
    commit: String!
    "Branch"
    branch: String!
  }

  type BuildConnection implements Connection {
    pageInfo: PageInfo!
    edges: [Build!]!
  }

  extend type Mutation {
    "Change the validationStatus on a build"
    setValidationStatus(
      buildId: ID!
      validationStatus: ValidationStatus!
    ): Build!
  }
`;

const getCompareScreenshotBucket = async (ctx: Context, build: Build) => {
  const bucket = await ctx.loaders.ScreenshotBucket.load(
    build.compareScreenshotBucketId,
  );
  if (!bucket) {
    throw new Error("Invariant: compare bucket not found");
  }
  return bucket;
};

export const resolvers: IResolvers = {
  Build: {
    async screenshotDiffs(build, { first, after }) {
      const result = await build
        .$relatedQuery("screenshotDiffs")
        .leftJoinRelated("[baseScreenshot, compareScreenshot]")
        .orderByRaw(ScreenshotDiff.sortDiffByStatus)
        .orderBy("screenshot_diffs.group", "asc", "last")
        .orderBy("compareScreenshot.name", "asc")
        .orderBy("baseScreenshot.name", "asc")
        .orderBy("screenshot_diffs.id", "asc")
        .range(after, after + first - 1);

      return paginateResult({ result, first, after });
    },
    baseScreenshotBucket: async (build, _args, ctx) => {
      if (!build.baseScreenshotBucketId) return null;
      return ctx.loaders.ScreenshotBucket.load(build.baseScreenshotBucketId);
    },
    status: async (build, _args, ctx) => {
      return ctx.loaders.BuildAggregatedStatus.load(
        build,
      ) as Promise<IBuildStatus>;
    },
    stats: async (build) => {
      return Build.getStats(build.id);
    },
    commit: async (build, _args, ctx) => {
      if (build.prHeadCommit) return build.prHeadCommit;
      const compareBucket = await getCompareScreenshotBucket(ctx, build);
      return compareBucket.commit;
    },
    branch: async (build, _args, ctx) => {
      const compareBucket = await getCompareScreenshotBucket(ctx, build);
      return compareBucket.branch;
    },
  },
  Mutation: {
    setValidationStatus: async (_root, args, ctx) => {
      if (!ctx.auth) {
        throw unauthenticated();
      }

      const { buildId, validationStatus } = args;
      const build = await Build.query()
        .findById(buildId)
        .withGraphFetched("project.account");

      if (!build) {
        throw new APIError("Build not found");
      }

      if (!build.project) {
        throw new Error("Invariant: no project found");
      }

      if (!build.project.account) {
        throw new Error("Invariant: no project account found");
      }

      const hasWriteAccess = await build.project.$checkWritePermission(
        ctx.auth.user,
      );

      if (!hasWriteAccess) {
        throw new APIError("You don't have access to this build");
      }

      await ScreenshotDiff.query()
        .where({ buildId })
        .patch({ validationStatus });

      // That might be better suited into a $afterUpdate hook.
      switch (validationStatus) {
        case "accepted": {
          await pushBuildNotification({
            buildId,
            type: "diff-accepted",
          });
          break;
        }
        case "rejected": {
          await pushBuildNotification({
            buildId,
            type: "diff-rejected",
          });
          break;
        }
      }

      return build;
    },
  },
};
