import { invariant } from "@argos/util/invariant";

import { transaction } from "@/database";
import {
  Build,
  Screenshot,
  ScreenshotBucket,
  ScreenshotDiff,
} from "@/database/models";

import { BuildStrategy, getBuildStrategy } from "./strategy";
import type { VirtualScreenshotBucket } from "./strategy/types";

/**
 * Get the base screenshot bucket for a build, or retrieve it if it doesn't exist.
 */
async function getOrRetrieveBaseBucket<T>(input: {
  build: Build;
  strategy: BuildStrategy<T>;
  ctx: T;
}): Promise<ScreenshotBucket | VirtualScreenshotBucket | null> {
  const { build, strategy, ctx } = input;
  if (build.baseScreenshotBucket) {
    return build.baseScreenshotBucket;
  }

  const { baseBranch, baseBranchResolvedFrom, baseBucket } =
    await strategy.getBase(build, ctx);

  await Promise.all([
    Build.query()
      .findById(build.id)
      .patch({
        baseBranch,
        baseBranchResolvedFrom,
        baseScreenshotBucketId:
          baseBucket instanceof ScreenshotBucket ? baseBucket.id : null,
      }),
    baseBucket instanceof ScreenshotBucket
      ? baseBucket.$fetchGraph("screenshots")
      : null,
  ]);

  return baseBucket;
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

/**
 * Create the diffs for the build.
 */
export async function createBuildDiffs(build: Build) {
  // If the build already has a type, it means the diffs have already been created.
  if (build.type) {
    return ScreenshotDiff.query().where({ buildId: build.id });
  }

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

  invariant(compareScreenshotBucket.complete, "compare bucket is not complete");

  const compareScreenshots = compareScreenshotBucket.screenshots;
  invariant(compareScreenshots, "no compare screenshots found for build");

  const ctx = await strategy.getContext(richBuild);
  const baseBucket = await getOrRetrieveBaseBucket({
    build: richBuild,
    strategy,
    ctx,
  });

  const sameBucket = Boolean(
    baseBucket instanceof ScreenshotBucket &&
    baseBucket.id === compareScreenshotBucket.id,
  );

  // Index the baseline by name so each compare screenshot can probe its
  // candidates cheaply. The first screenshot wins for a duplicated name, which
  // preserves the previous `Array.find` behaviour.
  const baseScreenshotsByName = new Map<string, Screenshot>();
  for (const screenshot of baseBucket?.screenshots ?? []) {
    if (!baseScreenshotsByName.has(screenshot.name)) {
      baseScreenshotsByName.set(screenshot.name, screenshot);
    }
  }

  // Baselines that a compare screenshot is being diffed against. They are still
  // in use, so they must not also be reported as removed — which can happen
  // when a baseline is reached through a fallback name instead of its own.
  const usedBaseScreenshotIds = new Set<string>();

  const inserts = compareScreenshots.map((compareScreenshot) => {
    const baseScreenshot = (() => {
      if (sameBucket) {
        return null;
      }

      if (!baseBucket) {
        return null;
      }

      // Don't create diffs for failure screenshots
      if (ScreenshotDiff.screenshotFailureRegexp.test(compareScreenshot.name)) {
        return null;
      }

      invariant(baseBucket.screenshots, "no base screenshots found for build");

      // Try each candidate in order and keep the first one present in the
      // baseline. Without an override the only candidate is the screenshot's
      // own name.
      for (const candidate of compareScreenshot.$getBaseNameCandidates()) {
        const found = baseScreenshotsByName.get(candidate);
        if (found) {
          return found;
        }
      }

      return null;
    })();

    if (baseScreenshot) {
      usedBaseScreenshotIds.add(baseScreenshot.id);
    }

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
      testId: compareScreenshot.testId,
    };
  });

  const compareScreenshotNames = compareScreenshots.map(({ name }) => name);

  const removedScreenshots =
    baseBucket?.screenshots
      ?.filter(
        ({ id, name }) =>
          !compareScreenshotNames.includes(name) &&
          !usedBaseScreenshotIds.has(id) &&
          // Don't mark failure screenshots as removed
          !ScreenshotDiff.screenshotFailureRegexp.test(name),
      )
      .map((baseScreenshot) => {
        return {
          buildId: richBuild.id,
          baseScreenshotId: baseScreenshot.id,
          compareScreenshotId: null,
          jobStatus: "complete" as const,
          score: null,
          testId: baseScreenshot.testId,
        };
      }) ?? [];

  const allInserts = [...inserts, ...removedScreenshots];

  const buildType = (() => {
    return strategy.getBuildType(
      {
        baseBucket,
        compareScreenshotBucket,
      },
      ctx,
    );
  })();

  return transaction(async (trx) => {
    const [diffs] = await Promise.all([
      allInserts.length > 0
        ? ScreenshotDiff.query(trx).insertAndFetch(allInserts)
        : [],
      Build.query(trx).findById(build.id).patch({ type: buildType }),
    ]);

    return diffs;
  });
}
