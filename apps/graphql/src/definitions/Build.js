import { gql } from "graphql-tag";

import { pushBuildNotification } from "@argos-ci/build-notification";
import { knex } from "@argos-ci/database";
import { Account, Build, ScreenshotDiff } from "@argos-ci/database/models";

import {
  RepositoryLoader,
  ScreenshotBucketLoader,
  buildLoader,
} from "../loaders";
import { APIError } from "../util";
import { paginateResult } from "./PageInfo";

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

export const resolvers = {
  Build: {
    async screenshotDiffs(build, { where, limit = 10, offset = 0 }) {
      const query = build
        .$relatedQuery("screenshotDiffs")
        .leftJoinRelated("[baseScreenshot, compareScreenshot]")
        // sort screenshots by : "failed", "updated", "added" and "removed", "stable"
        .orderByRaw(
          `CASE \
            WHEN "baseScreenshot"."name" IS NULL AND "compareScreenshot"."name" LIKE '%failed%' \
              THEN 0 \
            WHEN "score" IS NOT NULL AND "score" > 0 \
              THEN 1 \
            WHEN "baseScreenshot"."name" IS NULL \
              THEN 3 \
            WHEN "compareScreenshot"."name" IS NULL \
              THEN 4 \
            ELSE 10 \
          END ASC`
        )
        .orderBy("compareScreenshot.name", "asc")
        .orderBy("baseScreenshot.name", "asc")
        .orderBy("id", "asc")
        .range(offset, offset + limit - 1);

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

      const result = await query;
      return paginateResult({ result, offset, limit });
    },
    compareScreenshotBucket: async (build) => {
      return ScreenshotBucketLoader.load(build.compareScreenshotBucketId);
    },
    compositeStatus: async (build) => {
      if (build.type && build.type !== "check") {
        return build.type;
      }
      return buildLoader.load(build);
    },
    baseScreenshotBucket: async (build) => {
      if (!build.baseScreenshotBucketId) return null;
      return ScreenshotBucketLoader.load(build.baseScreenshotBucketId);
    },
    async repository(build) {
      return RepositoryLoader.load(build.repositoryId);
    },
    async status(build) {
      return buildLoader.load(build);
    },
    async stats(build) {
      const data = await ScreenshotDiff.query()
        .where("buildId", build.id)
        .leftJoin(
          "screenshots",
          "screenshot_diffs.compareScreenshotId",
          "screenshots.id"
        )
        .select(
          knex.raw(`\
            CASE \
              WHEN "compareScreenshotId" IS NULL THEN 'removed' \
              WHEN name ~ '(failed)' THEN 'failed' \
              WHEN score IS NULL THEN 'added' \
              WHEN score = 0 THEN 'stable' \
              ELSE 'updated' \
            END \
            AS status \
          `)
        )
        .count("*")
        .groupBy(1);

      const stats = data.reduce(
        (res, { status, count }) => ({ ...res, [status]: count }),
        { failed: 0, added: 0, stable: 0, updated: 0, removed: 0 }
      );

      return {
        failedScreenshotCount: stats.failed,
        addedScreenshotCount: stats.added,
        stableScreenshotCount: stats.stable,
        updatedScreenshotCount: stats.updated,
        removedScreenshotCount: stats.removed,
        screenshotCount: Object.values(stats).reduce(
          (sum, count) => parseInt(count, 10) + sum,
          0
        ),
      };
    },
  },
  Mutation: {
    async setValidationStatus(source, args, context) {
      if (!context.user) {
        throw new APIError("Invalid user identification");
      }

      const { buildId, validationStatus } = args;
      const user = await Build.getUsers(buildId).findById(context.user.id);

      if (!user) {
        throw new APIError("Invalid user authorization");
      }

      const build = await Build.query()
        .findById(buildId)
        .withGraphFetched("repository");

      if (build.repository.private) {
        const account = await Account.getAccount(build.repository);
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
      if (validationStatus === ScreenshotDiff.VALIDATION_STATUSES.accepted) {
        await pushBuildNotification({
          buildId,
          type: "diff-accepted",
        });
      } else if (
        validationStatus === ScreenshotDiff.VALIDATION_STATUSES.rejected
      ) {
        await pushBuildNotification({
          buildId,
          type: "diff-rejected",
        });
      }

      return build;
    },
  },
};
