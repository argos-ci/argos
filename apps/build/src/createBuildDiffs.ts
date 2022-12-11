import type { TransactionOrKnex } from "objection";

import { transaction } from "@argos-ci/database";
import { Build, Screenshot, ScreenshotDiff } from "@argos-ci/database/models";
import type {
  BuildType,
  Repository,
  ScreenshotBucket,
} from "@argos-ci/database/models";

import { baseCompare } from "./baseCompare.js";

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

  const baseScreenshotBucket = await baseCompare({
    baseCommit: build.repository!.referenceBranch,
    compareCommit: build.compareScreenshotBucket!.commit,
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

export const createBuildDiffs = async (build: Build) => {
  return transaction(async (trx) => {
    const richBuild = await build
      .$query(trx)
      .withGraphFetched(
        "[repository, baseScreenshotBucket.screenshots.file, compareScreenshotBucket.screenshots.file]"
      );

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
