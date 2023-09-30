import type { S3Client } from "@aws-sdk/client-s3";
import type { TransactionOrKnex } from "objection";
import { createReadStream } from "node:fs";
import { createHash } from "node:crypto";

import { pushBuildNotification } from "@argos-ci/build-notification";
import { raw, transaction } from "@argos-ci/database";
import { File, Screenshot, ScreenshotDiff } from "@argos-ci/database/models";
import { S3ImageFile } from "@argos-ci/storage";
import { getRedisLock } from "@argos-ci/common";

import { ImageDiffResult, diffImages } from "./util/image-diff/index.js";

export const hashFile = async (filepath: string): Promise<string> => {
  const fileStream = createReadStream(filepath);
  const hash = createHash("sha256");
  await new Promise((resolve, reject) => {
    fileStream.on("error", reject);
    hash.on("error", reject);
    hash.on("finish", resolve);
    fileStream.pipe(hash);
  });
  return hash.digest("hex");
};

const getOrCreateFile = async (
  values: { key: string; width: number; height: number },
  trx: TransactionOrKnex,
) => {
  const file = await File.query(trx).findOne({ key: values.key });
  if (file) {
    return file;
  }

  return File.query(trx).insert(values).returning("*");
};

/**
 * Ensures that the associated file of the screenshot has dimensions,
 * and if not, it adds them, preparing the files for CDN.
 */
async function ensureFileDimensionsAndPreload({
  s3Image,
  screenshot,
}: {
  s3Image: S3ImageFile;
  screenshot: Screenshot;
}) {
  if (screenshot?.file?.width != null && screenshot?.file?.height != null) {
    return;
  }

  const dimensions = await s3Image.getDimensions();
  if (screenshot.fileId) {
    await File.query().findById(screenshot.fileId).patch(dimensions);
    return;
  }

  await transaction(async (trx) => {
    const file = await getOrCreateFile(
      { ...dimensions, key: screenshot.s3Id },
      trx,
    );
    await Screenshot.query(trx)
      .findById(screenshot.id)
      .patch({ fileId: file.id });
  });
}

async function lockAndUploadDiffFile({
  key,
  diffResult,
  diffImage,
}: {
  key: string;
  diffResult: ImageDiffResult;
  diffImage: S3ImageFile;
}) {
  const lock = await getRedisLock();
  return lock.acquire(`diffUpload-${key}`, async () => {
    // Check if the diff file has been uploaded by another process
    const existingDiffFile = await File.query().findOne({ key });
    if (existingDiffFile) return existingDiffFile;

    await diffImage.upload();
    return File.query()
      .insert({ key, width: diffResult.width, height: diffResult.height })
      .returning("*");
  });
}

/**
 * Processes the diff result. Returns the existing file if found.
 * If not, uploads the new diff using a lock to avoid concurrency issues.
 */
async function getOrCreateDiffFile({
  diffResult,
  s3,
  bucket,
  key,
}: {
  diffResult: ImageDiffResult;
  s3: S3Client;
  bucket: string;
  key: string;
}) {
  const diffImage = new S3ImageFile({
    s3,
    bucket: bucket,
    filepath: diffResult.filepath,
    key,
  });
  const existingDiffFile = await File.query().findOne({ key });
  const diffFile =
    existingDiffFile ||
    (await lockAndUploadDiffFile({ key, diffResult, diffImage }));
  await diffImage.unlink();
  return diffFile;
}

async function areAllDiffsCompleted(buildId: string): Promise<{
  complete: boolean;
  diff: boolean;
}> {
  const isComplete = raw(`bool_and("jobStatus" = 'complete') as complete`);
  const hasDiff = raw(
    `count(*) FILTER (
      WHERE score > 0 AND (
        muted IS NULL
        OR muted = FALSE
        OR (muted = TRUE AND test."muteUntil" > now())
      )
    ) > 0 AS diff`,
  );
  const result = await ScreenshotDiff.query()
    .select(isComplete, hasDiff)
    .leftJoinRelated("test")
    .where("buildId", buildId)
    .first();
  return result as unknown as { complete: boolean; diff: boolean };
}

/**
 * Computes the screenshot difference
 */
export const computeScreenshotDiff = async (
  poorScreenshotDiff: ScreenshotDiff,
  { s3, bucket }: { s3: S3Client; bucket: string },
) => {
  if (poorScreenshotDiff.jobStatus === "complete") return;

  const screenshotDiff = await poorScreenshotDiff
    .$query()
    .withGraphFetched(
      "[build, baseScreenshot.file, compareScreenshot.[file, screenshotBucket]]",
    );

  if (!screenshotDiff) {
    throw new Error(`Screenshot diff id: \`${screenshotDiff}\` not found`);
  }

  if (!screenshotDiff.compareScreenshot) {
    throw new Error(
      `Invariant violation: compareScreenshot should be defined for screenshotDiff id: \`${screenshotDiff.id}\``,
    );
  }

  const baseImage = screenshotDiff.baseScreenshot?.s3Id
    ? new S3ImageFile({
        s3,
        bucket: bucket,
        key: screenshotDiff.baseScreenshot.s3Id,
        dimensions:
          screenshotDiff.baseScreenshot.file?.width != null &&
          screenshotDiff.baseScreenshot.file?.height != null
            ? {
                width: screenshotDiff.baseScreenshot.file.width,
                height: screenshotDiff.baseScreenshot.file.height,
              }
            : null,
      })
    : null;

  const compareImage = new S3ImageFile({
    s3,
    bucket: bucket,
    key: screenshotDiff.compareScreenshot.s3Id,
    dimensions:
      screenshotDiff.compareScreenshot.file?.width != null &&
      screenshotDiff.compareScreenshot.file?.height != null
        ? {
            width: screenshotDiff.compareScreenshot.file.width,
            height: screenshotDiff.compareScreenshot.file.height,
          }
        : null,
  });

  const { buildId } = screenshotDiff;

  // Patching cannot be done in parallel since the file can be the same and must be created only
  if (baseImage && screenshotDiff.baseScreenshot) {
    await ensureFileDimensionsAndPreload({
      screenshot: screenshotDiff.baseScreenshot,
      s3Image: baseImage,
    });
  }

  await ensureFileDimensionsAndPreload({
    screenshot: screenshotDiff.compareScreenshot,
    s3Image: compareImage,
  });

  if (baseImage && baseImage.key !== compareImage.key && !screenshotDiff.s3Id) {
    const diffResult = await diffImages({ baseImage, compareImage });

    if (diffResult.score === 0) {
      await ScreenshotDiff.query()
        .findById(screenshotDiff.id)
        .patch({ score: diffResult.score });
    } else {
      const key = await hashFile(diffResult.filepath);
      const diffFile = await getOrCreateDiffFile({
        diffResult,
        s3,
        bucket,
        key,
      });
      await ScreenshotDiff.query()
        .findById(screenshotDiff.id)
        .patch({ s3Id: key, score: diffResult.score, fileId: diffFile.id });
    }
  }

  // Update screenshot diff status
  await ScreenshotDiff.query()
    .findById(screenshotDiff.id)
    .patch({ jobStatus: "complete" });

  // Patch group on screenshot diffs
  const similarDiffCount = await ScreenshotDiff.query()
    .where({ buildId, s3Id: screenshotDiff.s3Id })
    .resultSize();
  if (similarDiffCount > 1) {
    await ScreenshotDiff.query()
      .where({ buildId, s3Id: screenshotDiff.s3Id, group: null })
      .patch({ group: screenshotDiff.s3Id });
  }

  // Unlink images
  await Promise.all([baseImage?.unlink(), compareImage.unlink()]);

  // Push notification if all screenshot diffs are completed
  const { complete, diff } = await areAllDiffsCompleted(buildId);
  if (complete) {
    await pushBuildNotification({
      buildId,
      type: diff ? "diff-detected" : "no-diff-detected",
    });
  }
};
