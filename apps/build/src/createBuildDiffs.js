import { transaction } from "@argos-ci/database";
import { ScreenshotDiff, Build } from "@argos-ci/database/models";
import { baseCompare } from "./baseCompare";

export async function getOrCreateBaseScreenshotBucket(build, { trx } = {}) {
  // It can already be present, for instance by the sample build feature.
  if (build.baseScreenshotBucket) {
    return build.baseScreenshotBucket;
  }

  const baseScreenshotBucket = await baseCompare({
    baseCommit: build.repository.referenceBranch,
    compareCommit: build.compareScreenshotBucket.commit,
    build,
    trx,
  });

  if (baseScreenshotBucket) {
    await Build.query(trx)
      .findById(build.id)
      .patch({
        baseScreenshotBucketId: baseScreenshotBucket.id,
        type:
          build.compareScreenshotBucket.branch ===
          build.repository.referenceBranch
            ? "reference"
            : "check",
      });

    return baseScreenshotBucket.$query(trx).withGraphFetched("screenshots");
  }

  await Build.query(trx).findById(build.id).patch({ type: "orphan" });
  return null;
}

function getJobStatus({ compareWithBaseline, baseScreenshot, sameFileId }) {
  if (compareWithBaseline) return "complete";
  if (!baseScreenshot) return "complete";
  if (sameFileId) return "complete";
  return "pending";
}

export async function createBuildDiffs(build) {
  return transaction(async (trx) => {
    const richBuild = await build
      .$query(trx)
      .withGraphFetched(
        "[repository, baseScreenshotBucket.screenshots, compareScreenshotBucket.screenshots]"
      );

    const baseScreenshotBucket = await getOrCreateBaseScreenshotBucket(
      richBuild,
      { trx }
    );

    const compareWithBaseline = Boolean(
      baseScreenshotBucket &&
        baseScreenshotBucket.commit === richBuild.compareScreenshotBucket.commit
    );
    const sameBucket = Boolean(
      baseScreenshotBucket &&
        baseScreenshotBucket.id === richBuild.compareScreenshotBucket.id
    );

    const inserts = richBuild.compareScreenshotBucket.screenshots.map(
      (compareScreenshot) => {
        const baseScreenshot =
          !sameBucket && baseScreenshotBucket
            ? baseScreenshotBucket.screenshots.find(
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
            compareWithBaseline,
            baseScreenshot,
            sameFileId,
          }),
          score: sameFileId ? 0 : null,
          validationStatus: ScreenshotDiff.VALIDATION_STATUSES.unknown,
        };
      },
      []
    );

    return ScreenshotDiff.query(trx).insert(inserts);
  });
}
