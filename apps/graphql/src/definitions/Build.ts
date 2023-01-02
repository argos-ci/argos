import gqlTag from "graphql-tag";

import { pushBuildNotification } from "@argos-ci/build-notification";
import { Account, Build, ScreenshotDiff } from "@argos-ci/database/models";

import type { Context } from "../context.js";
import { APIError } from "../util.js";
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
    "The screenshot bucket of the build commit"
    compareScreenshotBucket: ScreenshotBucket!
    "Continuous number. It is incremented after each build"
    number: Int!
    "Review status, conclusion or job status"
    status: BuildStatus!
    "Build name"
    name: String!
    "Build stats"
    stats: BuildStats!
    "Build type"
    type: BuildType
    "Received batch count "
    batchCount: Int
    "Expected batch count"
    totalBatch: Int
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

export const resolvers = {
  Build: {
    async screenshotDiffs(
      build: Build,
      { first, after }: { first: number; after: number }
    ) {
      const result = await build
        .$relatedQuery("screenshotDiffs")
        .leftJoinRelated("[baseScreenshot, compareScreenshot]")
        .orderByRaw(ScreenshotDiff.sortDiffByStatus)
        .orderBy("compareScreenshot.name", "asc")
        .orderBy("baseScreenshot.name", "asc")
        .orderBy("screenshot_diffs.id", "asc")
        .range(after, after + first - 1);

      return paginateResult({ result, first, after });
    },
    compareScreenshotBucket: async (
      build: Build,
      _args: Record<string, never>,
      context: Context
    ) => {
      return context.loaders.ScreenshotBucket.load(
        build.compareScreenshotBucketId
      );
    },
    baseScreenshotBucket: async (
      build: Build,
      _args: Record<string, never>,
      context: Context
    ) => {
      if (!build.baseScreenshotBucketId) return null;
      return context.loaders.ScreenshotBucket.load(
        build.baseScreenshotBucketId
      );
    },
    status: async (
      build: Build,
      _args: Record<string, never>,
      context: Context
    ) => {
      return context.loaders.BuildAggregatedStatus.load(build);
    },
    stats: async (build: Build) => {
      return Build.getStats(build.id);
    },
  },
  Mutation: {
    setValidationStatus: async (
      _root: null,
      args: {
        buildId: string;
        validationStatus: "unknown" | "accepted" | "rejected";
      },
      ctx: Context
    ) => {
      if (!ctx.user) {
        throw new APIError("Invalid user identification");
      }

      const { buildId, validationStatus } = args;
      const [user, build] = await Promise.all([
        Build.getUsers(buildId).findById(ctx.user.id),
        Build.query().findById(buildId).withGraphFetched("repository"),
      ]);

      if (!user) {
        throw new APIError("Invalid user authorization");
      }

      if (!build) {
        throw new APIError("Build not found");
      }

      if (build.repository!.private || build.repository!.forcedPrivate) {
        const account = await Account.getAccount(build.repository!);
        const hasExceedLimit = await account.hasExceedScreenshotsMonthlyLimit();
        if (hasExceedLimit) {
          throw new APIError(
            "Insufficient credit. Please upgrade Argos plan to unlock build reviews."
          );
        }
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
