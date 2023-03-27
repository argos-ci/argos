import { TransactionOrKnex, knex, transaction } from "@argos-ci/database";
import { Build, Screenshot, ScreenshotDiff } from "@argos-ci/database/models";
import type {
  BuildType,
  Repository,
  ScreenshotBucket,
} from "@argos-ci/database/models";

import { getBaseScreenshotBucket } from "./base.js";

const getBuildType = ({
  baseScreenshotBucket,
  compareScreenshotBucket,
  repository,
}: {
  baseScreenshotBucket: ScreenshotBucket | null;
  compareScreenshotBucket: ScreenshotBucket;
  repository: Repository;
}): BuildType => {
  if (!baseScreenshotBucket) {
    return "orphan";
  }
  if (compareScreenshotBucket.branch === repository.referenceBranch) {
    return "reference";
  }
  return "check";
};

export const getOrCreateBaseScreenshotBucket = async (
  build: Build,
  { trx }: { trx?: TransactionOrKnex | undefined } = {}
) => {
  // It can already be present, for instance by the sample build feature.
  if (build.baseScreenshotBucket) {
    return build.baseScreenshotBucket!;
  }

  const baseScreenshotBucket = await getBaseScreenshotBucket({
    build,
    trx,
  });

  if (baseScreenshotBucket) {
    await Build.query(trx)
      .findById(build.id)
      .patch({ baseScreenshotBucketId: baseScreenshotBucket.id });

    return baseScreenshotBucket.$query(trx).withGraphFetched("screenshots");
  }

  return null;
};

const getJobStatus = ({
  baseScreenshot,
  sameFileId,
  compareScreenshot,
}: {
  baseScreenshot: Screenshot | null;
  sameFileId: boolean;
  compareScreenshot: Screenshot;
}) => {
  if (
    baseScreenshot &&
    (baseScreenshot.fileId === null ||
      baseScreenshot.file?.width == null ||
      baseScreenshot.file?.height == null)
  ) {
    return "pending" as const;
  }
  if (
    compareScreenshot.fileId === null ||
    compareScreenshot.file?.width == null ||
    compareScreenshot.file?.height == null
  ) {
    return "pending" as const;
  }
  if (!baseScreenshot) return "complete" as const;
  if (sameFileId) return "complete" as const;

  return "pending" as const;
};

export const getStabilityScores = async ({
  buildName,
  repositoryId,
}: {
  buildName: string;
  repositoryId: string;
}): Promise<{ [key: string]: number }> => {
  const stabilityScores = await knex.raw(
    `WITH "recent_builds_count" AS (
        SELECT
            count("builds"."id") AS ALL,
            count(DISTINCT "screenshot_buckets"."branch") AS branches
        FROM
            "builds"
            INNER JOIN "screenshot_buckets" ON "builds"."compareScreenshotBucketId" = "screenshot_buckets"."id"
        WHERE
            "builds"."repositoryId" = :repositoryId
            AND "builds"."name" = :buildName
            AND "builds"."createdAt" >= now() - interval '7 days'
    ),
    "recent_builds" AS (
        SELECT
            "builds"."id",
            "builds"."compareScreenshotBucketId",
            "screenshot_buckets"."branch" AS "branch"
        FROM
            "builds"
            INNER JOIN "screenshot_buckets" ON "builds"."compareScreenshotBucketId" = "screenshot_buckets"."id"
        WHERE
            "builds"."repositoryId" = :repositoryId
            AND "builds"."name" = :buildName
            AND "builds"."createdAt" >= now() - interval '7 days'
    ),
    "diff_screenshots" AS (
        SELECT
            "screenshots"."name",
            count(DISTINCT "recent_builds"."id") AS diff_count,
            count(DISTINCT screenshot_buckets.branch) AS diff_branches
        FROM
            "recent_builds"
            INNER JOIN "screenshot_buckets" ON "recent_builds"."compareScreenshotBucketId" = "screenshot_buckets"."id"
            INNER JOIN "screenshot_diffs" ON "recent_builds"."id" = "screenshot_diffs"."buildId"
            INNER JOIN "screenshots" ON "screenshot_diffs"."compareScreenshotId" = "screenshots"."id"
        WHERE
            screenshot_diffs.score > 0
        GROUP BY
            "screenshots"."name"
    )
    SELECT
        "diff_screenshots"."name",
        CASE WHEN "recent_builds_count"."all" < 10
          THEN 100
          ELSE ROUND((1 - diff_count::float / "recent_builds_count"."all"::float) * (1 - diff_branches::float / "recent_builds_count"."branches"::float) * 100)
        END AS "stabilityScore"
    FROM
        "diff_screenshots",
        "recent_builds_count"
    `,
    { repositoryId, buildName }
  );

  return stabilityScores.rows.reduce(
    (
      scores: { [key: string]: number },
      screenshot: { name: string; stabilityScore: number }
    ) => {
      scores[screenshot.name] = screenshot.stabilityScore;
      return scores;
    },
    {}
  );
};

export const createBuildDiffs = async (build: Build) => {
  const [richBuild, stabilityScores] = await Promise.all([
    build
      .$query()
      .withGraphFetched(
        "[repository, baseScreenshotBucket.screenshots.file, compareScreenshotBucket.screenshots.file]"
      ),
    getStabilityScores({
      buildName: build.name,
      repositoryId: build.repositoryId,
    }),
  ]);

  return transaction(async (trx) => {
    const baseScreenshotBucket = await getOrCreateBaseScreenshotBucket(
      richBuild,
      { trx }
    );

    await Build.query(trx)
      .findById(build.id)
      .patch({
        type: getBuildType({
          baseScreenshotBucket,
          compareScreenshotBucket: richBuild.compareScreenshotBucket!,
          repository: richBuild.repository!,
        }),
      });

    const sameBucket = Boolean(
      baseScreenshotBucket &&
        baseScreenshotBucket.id === richBuild.compareScreenshotBucket!.id
    );

    const inserts = richBuild.compareScreenshotBucket!.screenshots!.map(
      (compareScreenshot) => {
        const baseScreenshot =
          !sameBucket && baseScreenshotBucket
            ? baseScreenshotBucket.screenshots!.find(
                ({ name }) => name === compareScreenshot.name
              )
            : null;
        const sameFileId = Boolean(
          baseScreenshot &&
            baseScreenshot.fileId &&
            compareScreenshot.fileId &&
            baseScreenshot.fileId === compareScreenshot.fileId
        );

        return {
          buildId: richBuild.id,
          baseScreenshotId: baseScreenshot ? baseScreenshot.id : null,
          compareScreenshotId: compareScreenshot.id,
          jobStatus: getJobStatus({
            baseScreenshot: baseScreenshot ?? null,
            sameFileId,
            compareScreenshot,
          }),
          score: sameFileId ? 0 : null,
          validationStatus: "unknown" as const,
          stabilityScore: stabilityScores[compareScreenshot.name] ?? 100,
          testId: compareScreenshot.testId,
        };
      },
      []
    );

    const compareScreenshotNames =
      richBuild.compareScreenshotBucket!.screenshots!.map(({ name }) => name);

    const removedScreenshots =
      baseScreenshotBucket && baseScreenshotBucket.screenshots
        ? baseScreenshotBucket.screenshots
            .filter(({ name }) => !compareScreenshotNames.includes(name))
            .map((baseScreenshot) => ({
              buildId: richBuild.id,
              baseScreenshotId: baseScreenshot.id,
              compareScreenshotId: null,
              jobStatus: "complete" as const,
              score: null,
              validationStatus: "unknown" as const,
            }))
        : [];

    const allInserts = [...inserts, ...removedScreenshots];

    if (allInserts.length === 0) return [];

    return ScreenshotDiff.query(trx).insert(allInserts);
  });
};
