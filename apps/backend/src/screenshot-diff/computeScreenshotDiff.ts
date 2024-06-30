import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { invariant } from "@argos/util/invariant";
import type { S3Client } from "@aws-sdk/client-s3";
import type { TransactionOrKnex } from "objection";

import { pushBuildNotification } from "@/build-notification/index.js";
import { raw, transaction } from "@/database/index.js";
import { File, Screenshot, ScreenshotDiff } from "@/database/models/index.js";
import { S3ImageFile } from "@/storage/index.js";
import { chunk } from "@/util/chunk.js";
import { getRedisLock } from "@/util/redis/index.js";

import { DEFAULT_THRESHOLD, diffImages } from "./util/image-diff/index.js";

const hashFile = async (filepath: string): Promise<string> => {
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
  values: Pick<File, "width" | "height" | "type" | "key">,
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
async function ensureFileDimensions({
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
      { ...dimensions, type: "screenshot", key: screenshot.s3Id },
      trx,
    );
    await Screenshot.query(trx)
      .findById(screenshot.id)
      .patch({ fileId: file.id });
  });
}

async function lockAndUploadDiffFile(args: {
  key: string;
  width: number;
  height: number;
  image: S3ImageFile;
}) {
  const lock = await getRedisLock();
  return lock.acquire(`diffUpload-${args.key}`, async () => {
    // Check if the diff file has been uploaded by another process
    const existingDiffFile = await File.query().findOne({ key: args.key });
    if (existingDiffFile) {
      return existingDiffFile;
    }

    await args.image.upload();

    return File.query()
      .insert({
        key: args.key,
        width: args.width,
        height: args.height,
        type: "screenshotDiff",
      })
      .returning("*");
  });
}

/**
 * Processes the diff result. Returns the existing file if found.
 * If not, uploads the new diff using a lock to avoid concurrency issues.
 */
async function getOrCreateDiffFile(args: {
  filepath: string;
  width: number;
  height: number;
  s3: S3Client;
  bucket: string;
  key: string;
}) {
  const image = new S3ImageFile({
    s3: args.s3,
    bucket: args.bucket,
    filepath: args.filepath,
    key: args.key,
  });
  let file = await File.query().findOne({ key: args.key });
  if (!file) {
    file = await lockAndUploadDiffFile({
      key: args.key,
      width: args.width,
      height: args.height,
      image,
    });
  }
  await image.unlink();
  return file;
}

async function areAllDiffsCompleted(buildId: string): Promise<{
  complete: boolean;
  diff: boolean;
}> {
  const isComplete = raw(`bool_and("jobStatus" = 'complete') as complete`);
  const hasDiff = raw(
    `count(*) FILTER (WHERE (${ScreenshotDiff.selectDiffStatus}) in ('added', 'changed', 'removed')) > 0 AS diff`,
  );
  const result = await ScreenshotDiff.query()
    .select(isComplete, hasDiff)
    .leftJoinRelated("compareScreenshot")
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
  if (poorScreenshotDiff.jobStatus === "complete") {
    return;
  }

  const screenshotDiff = await poorScreenshotDiff
    .$query()
    .withGraphFetched(
      "[build, baseScreenshot.file, compareScreenshot.[file, screenshotBucket]]",
    );

  invariant(screenshotDiff?.compareScreenshot, "no compare screenshot");

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
    await ensureFileDimensions({
      screenshot: screenshotDiff.baseScreenshot,
      s3Image: baseImage,
    });
  }

  await ensureFileDimensions({
    screenshot: screenshotDiff.compareScreenshot,
    s3Image: compareImage,
  });

  let diffKey: string | null = null;

  if (baseImage && baseImage.key !== compareImage.key && !screenshotDiff.s3Id) {
    const diffResult = await diffImages(
      baseImage,
      compareImage,
      screenshotDiff.compareScreenshot.threshold ?? DEFAULT_THRESHOLD,
    );
    if (diffResult === null) {
      await ScreenshotDiff.query()
        .findById(screenshotDiff.id)
        .patch({ score: 0 });
    } else {
      diffKey = await hashFile(diffResult.filepath);
      const diffFile = await getOrCreateDiffFile({
        filepath: diffResult.filepath,
        width: diffResult.width,
        height: diffResult.height,
        s3,
        bucket,
        key: diffKey,
      });
      await ScreenshotDiff.query()
        .findById(screenshotDiff.id)
        .patch({ s3Id: diffKey, score: diffResult.score, fileId: diffFile.id });
    }
  }

  // Update screenshot diff status
  await ScreenshotDiff.query()
    .findById(screenshotDiff.id)
    .patch({ jobStatus: "complete" });

  if (diffKey) {
    const similarDiffCount = await ScreenshotDiff.query()
      .where({ buildId, s3Id: diffKey })
      .resultSize();

    // Patch group on screenshot diffs
    if (similarDiffCount > 1) {
      // Collect diffs to update
      const diffs = await ScreenshotDiff.query()
        .select("id")
        .where({ buildId, s3Id: diffKey, group: null });

      const diffIds = diffs.map(({ id }) => id);

      const diffIdsChunks = chunk(diffIds, 50);

      for (const diffIdsChunk of diffIdsChunks) {
        // Update diffs
        // We don't do the where in this query because of deadlock issues
        // Having `s3Id` in the where clause causes a deadlock
        await ScreenshotDiff.query()
          .whereIn("id", diffIdsChunk)
          .patch({ group: diffKey });
      }
    }
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
