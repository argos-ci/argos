import gqlTag from "graphql-tag";

import { pushBuildNotification } from "@argos-ci/build-notification";
import { knex } from "@argos-ci/database";
import { Account, Build, ScreenshotDiff } from "@argos-ci/database/models";

import type { Context } from "../context.js";
import { APIError } from "../util.js";
import { paginateResult } from "./PageInfo.js";
import { selectDiffStatus, sortDiffByStatus } from "./ScreenshotDiff.js";

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
    failedScreenshotCount: Int!
    addedScreenshotCount: Int!
    stableScreenshotCount: Int!
    updatedScreenshotCount: Int!
    removedScreenshotCount: Int!
    screenshotCount: Int!
  }

  input ScreenshotDiffWhere {
    passing: Boolean
  }

  type Build {
    id: ID!
    createdAt: DateTime!
    updatedAt: DateTime!
    "The screenshot diffs between the base screenshot bucket of the compare screenshot bucket"
    screenshotDiffs(
      where: ScreenshotDiffWhere
      offset: Int!
      limit: Int!
    ): ScreenshotDiffResult!
    "The screenshot diffs before and after the input rank"
    screenshotDiffCursorPaginated(
      limit: Int!
      rank: Int!
    ): ScreenshotDiffResult!
    diffs(offset: Int!, limit: Int!): ScreenshotDiffResult!
    "The screenshot bucket ID of the baselineBranch"
    baseScreenshotBucketId: ID
    "The screenshot bucket of the baselineBranch"
    baseScreenshotBucket: ScreenshotBucket
    "The screenshot bucket ID of the build commit"
    compareScreenshotBucketId: ID!
    "The screenshot bucket of the build commit"
    compareScreenshotBucket: ScreenshotBucket!
    "The repository associated to the build"
    repository: Repository!
    "Continuous number. It is incremented after each build"
    number: Int!
    "Review status, conclusion or job status"
    status: BuildStatus!
    "Merge build type and status"
    compositeStatus: String!
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

  type BuildResult {
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

const getSortedDiffsQuery = (build: Build) =>
  build
    .$relatedQuery("screenshotDiffs")
    .leftJoinRelated("[baseScreenshot, compareScreenshot]")
    .orderByRaw(sortDiffByStatus)
    .orderBy("compareScreenshot.name", "asc")
    .orderBy("baseScreenshot.name", "asc")
    .orderBy("screenshot_diffs.id", "asc");

export const resolvers = {
  Build: {
    diffs: async (build: Build, args: { offset: number; limit: number }) => {
      if (args.limit > 200) {
        throw new Error("Limit is too high");
      }
      const result = await build
        .$relatedQuery("screenshotDiffs")
        .orderBy("id", "asc")
        .range(args.offset, args.offset + args.limit - 1);
      return paginateResult({ result, offset: args.offset, limit: args.limit });
    },
    async screenshotDiffs(
      build: Build,
      {
        where,
        limit,
        offset,
      }: { where: { passing?: boolean }; limit: number; offset: number }
    ) {
      const query = getSortedDiffsQuery(build);

      if (where) {
        if (where.passing) {
          query.where("screenshot_diffs.score", 0);
        } else {
          query.where((qb) => {
            qb.whereNot("screenshot_diffs.score", 0).orWhereNull(
              "screenshot_diffs.score"
            );
          });
        }
      }

      const result = await query.range(offset, offset + limit - 1);
      return paginateResult({ result, offset, limit });
    },
    async screenshotDiffCursorPaginated(
      build: Build,
      { limit, rank }: { limit: number; rank: number }
    ) {
      const diffsTotalCount = await getSortedDiffsQuery(build).resultSize();
      const existingRank = rank < 1 || rank > diffsTotalCount ? 0 : rank;

      const diffs = await knex
        .with("diffs", getSortedDiffsQuery(build).toKnexQuery())
        .with(
          "rankedDiffs",
          knex.raw(
            'SELECT *, ROW_NUMBER() OVER (ORDER BY NULL) as rank FROM "diffs"'
          )
        )
        .with(
          "range",
          knex
            .select("rankedDiffs.*")
            .from("rankedDiffs")
            .whereBetween("rank", [
              Math.floor(existingRank - limit / 2),
              Math.floor(existingRank + limit / 2),
            ])
        )
        .from("range");

      return paginateResult({
        result: { total: diffsTotalCount, results: diffs },
        offset: diffs.length > 0 ? diffs[0].rank : 0,
        limit,
      });
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
    compositeStatus: async (
      build: Build,
      _args: Record<string, never>,
      context: Context
    ) => {
      if (build.type && build.type !== "check") {
        return build.type;
      }
      return context.loaders.BuildAggregatedStatus.load(build);
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
    repository: async (
      build: Build,
      _args: Record<string, never>,
      context: Context
    ) => {
      return context.loaders.Repository.load(build.repositoryId);
    },
    status: async (
      build: Build,
      _args: Record<string, never>,
      context: Context
    ) => {
      return context.loaders.BuildAggregatedStatus.load(build);
    },
    stats: async (build: Build) => {
      const data = (await ScreenshotDiff.query()
        .where("buildId", build.id)
        .leftJoin(
          "screenshots",
          "screenshot_diffs.compareScreenshotId",
          "screenshots.id"
        )
        .select(knex.raw(selectDiffStatus))
        .count("*")
        .groupBy("status")) as unknown as { status: string; count: string }[];

      const stats = data.reduce(
        (res, { status, count }) => ({ ...res, [status]: Number(count) }),
        { failed: 0, added: 0, stable: 0, updated: 0, removed: 0 }
      );

      return {
        failedScreenshotCount: stats.failed,
        addedScreenshotCount: stats.added,
        stableScreenshotCount: stats.stable,
        updatedScreenshotCount: stats.updated,
        removedScreenshotCount: stats.removed,
        screenshotCount:
          stats.failed +
          stats.added +
          stats.stable +
          stats.updated +
          stats.removed,
      };
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

      if (build.repository!.private) {
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
