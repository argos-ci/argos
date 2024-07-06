import { invariant } from "@argos/util/invariant";

import { transaction } from "@/database/index.js";
import { Build, Screenshot, ScreenshotDiff } from "@/database/models/index.js";
import type { ScreenshotBucket } from "@/database/models/index.js";

import { BuildStrategy, getBuildStrategy } from "./strategy/index.js";

/**
 * Get the base screenshot bucket for a build, or retrieve it if it doesn't exist.
 */
async function getOrRetrieveBaseScreenshotBucket(input: {
  build: Build;
  strategy: BuildStrategy<unknown>;
}): Promise<ScreenshotBucket | null> {
  const { build, strategy } = input;
  if (build.baseScreenshotBucket) {
    return build.baseScreenshotBucket;
  }

  const baseScreenshotBucket = await strategy.getBaseScreenshotBucket(build);

  if (baseScreenshotBucket) {
    await Promise.all([
      Build.query()
        .findById(build.id)
        .patch({ baseScreenshotBucketId: baseScreenshotBucket.id }),
      baseScreenshotBucket.$fetchGraph("screenshots"),
    ]);

    return baseScreenshotBucket;
  }

  return null;
}

function getJobStatus({
  baseScreenshot,
  sameFileId,
  compareScreenshot,
}: {
  baseScreenshot: Screenshot | null;
  sameFileId: boolean;
  compareScreenshot: Screenshot;
}) {
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

  if (!baseScreenshot) {
    return "complete" as const;
  }

  if (sameFileId) {
    return "complete" as const;
  }

  return "pending" as const;
}

export async function createBuildDiffs(build: Build) {
  const strategy = getBuildStrategy(build);

  const richBuild = await build
    .$query()
    .withGraphFetched(
      "[project, baseScreenshotBucket.screenshots.file, compareScreenshotBucket.screenshots.file]",
    );

  const project = richBuild.project;
  invariant(project, "no project found for build");

  const compareScreenshotBucket = richBuild.compareScreenshotBucket;
  invariant(
    compareScreenshotBucket,
    "no compare screenshot bucket found for build",
  );

  const compareScreenshots = compareScreenshotBucket.screenshots;
  invariant(compareScreenshots, "no compare screenshots found for build");

  const [ctx, baseScreenshotBucket] = await Promise.all([
    strategy.getContext(richBuild),
    getOrRetrieveBaseScreenshotBucket({ build: richBuild, strategy }),
  ]);

  const sameBucket = Boolean(
    baseScreenshotBucket &&
      baseScreenshotBucket.id === compareScreenshotBucket.id,
  );

  const inserts = compareScreenshots.map((compareScreenshot) => {
    const baseScreenshot = (() => {
      if (sameBucket) {
        return null;
      }

      if (!baseScreenshotBucket) {
        return null;
      }

      // Don't create diffs for failure screenshots
      if (ScreenshotDiff.screenshotFailureRegexp.test(compareScreenshot.name)) {
        return null;
      }

      invariant(
        baseScreenshotBucket.screenshots,
        "no base screenshots found for build",
      );

      return baseScreenshotBucket.screenshots.find(({ name }) => {
        if (compareScreenshot.baseName) {
          return name === compareScreenshot.baseName;
        }
        return name === compareScreenshot.name;
      });
    })();

    const sameFileId = Boolean(
      baseScreenshot?.fileId &&
        compareScreenshot.fileId &&
        baseScreenshot.fileId === compareScreenshot.fileId,
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
      testId: compareScreenshot.testId,
    };
  });

  const compareScreenshotNames = compareScreenshots.map(({ name }) => name);

  const removedScreenshots =
    baseScreenshotBucket?.screenshots
      ?.filter(
        ({ name }) =>
          !compareScreenshotNames.includes(name) &&
          // Don't mark failure screenshots as removed
          !ScreenshotDiff.screenshotFailureRegexp.test(name),
      )
      .map((baseScreenshot) => ({
        buildId: richBuild.id,
        baseScreenshotId: baseScreenshot.id,
        compareScreenshotId: null,
        jobStatus: "complete" as const,
        score: null,
        validationStatus: "unknown" as const,
      })) ?? [];

  const allInserts = [...inserts, ...removedScreenshots];

  const buildType = strategy.getBuildType(
    {
      baseScreenshotBucket,
      compareScreenshotBucket,
    },
    ctx,
  );

  return transaction(async (trx) => {
    const [screenshots] = await Promise.all([
      allInserts.length > 0
        ? ScreenshotDiff.query(trx).insertAndFetch(allInserts)
        : [],
      Build.query(trx).findById(build.id).patch({ type: buildType }),
    ]);

    return screenshots;
  });
}
