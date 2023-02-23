import type { S3Client } from "@aws-sdk/client-s3";
import type { TransactionOrKnex } from "objection";

import { pushBuildNotification } from "@argos-ci/build-notification";
import { raw, transaction } from "@argos-ci/database";
import { File, Screenshot, ScreenshotDiff } from "@argos-ci/database/models";
import { S3ImageFile } from "@argos-ci/storage";

import { diffImages } from "./util/image-diff/index.js";

const getOrCreateFile = async (
  values: { key: string; width: number; height: number },
  trx: TransactionOrKnex
) => {
  const file = await File.query(trx).findOne({ key: values.key });
  if (file) {
    return file;
  }
  return File.query(trx).insert(values).returning("*");
};

/**
 * Complete files with dimensions and preload them on CDN.
 */
async function completeFile({
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
  } else {
    await transaction(async (trx) => {
      const file = await getOrCreateFile(
        {
          ...dimensions,
          key: screenshot.s3Id,
        },
        trx
      );
      await Screenshot.query(trx).findById(screenshot.id).patch({
        fileId: file.id,
      });
    });
  }
}

export const computeScreenshotDiff = async (
  poorScreenshotDiff: ScreenshotDiff,
  { s3, bucket }: { s3: S3Client; bucket: string }
) => {
  if (poorScreenshotDiff.jobStatus === "complete") return;

  const screenshotDiff = await poorScreenshotDiff
    .$query()
    .withGraphFetched(
      "[build, baseScreenshot.file, compareScreenshot.[file, screenshotBucket]]"
    );

  if (!screenshotDiff) {
    throw new Error(`Screenshot diff id: \`${screenshotDiff}\` not found`);
  }

  if (!screenshotDiff.compareScreenshot) {
    throw new Error(
      `Invariant violation: compareScreenshot should be defined for screenshotDiff id: \`${screenshotDiff.id}\``
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

  // Patching cannot be done in parallel since the file can be the same and must be created only
  if (baseImage && screenshotDiff.baseScreenshot) {
    await completeFile({
      screenshot: screenshotDiff.baseScreenshot,
      s3Image: baseImage,
    });
  }

  await completeFile({
    screenshot: screenshotDiff.compareScreenshot,
    s3Image: compareImage,
  });

  if (baseImage && baseImage.key !== compareImage.key && !screenshotDiff.s3Id) {
    const diffResult = await diffImages({
      baseImage,
      compareImage,
    });

    if (diffResult.score > 0) {
      const diffImage = new S3ImageFile({
        s3,
        bucket: bucket,
        filepath: diffResult.filepath,
      });
      const key = await diffImage.upload();
      await diffImage.unlink();
      await transaction(async (trx) => {
        const diffFile = await File.query(trx)
          .insert({
            key,
            width: diffResult.width,
            height: diffResult.height,
          })
          .returning("*");
        await ScreenshotDiff.query(trx).findById(screenshotDiff.id).patch({
          score: diffResult.score,
          s3Id: diffFile.key,
          fileId: diffFile.id,
        });
      });
    } else {
      await ScreenshotDiff.query()
        .findById(screenshotDiff.id)
        .patch({ score: diffResult.score });
    }
  }

  await ScreenshotDiff.query()
    .findById(screenshotDiff.id)
    .patch({ jobStatus: "complete" });

  await Promise.all([baseImage?.unlink(), compareImage.unlink()]);

  // @ts-ignore
  const [{ complete, diff }] = await ScreenshotDiff.query()
    .select(
      raw(`bool_and("jobStatus" = 'complete') as complete`),
      raw("bool_or(score > 0) as diff")
    )
    .where("buildId", screenshotDiff.buildId)
    .groupBy("buildId");

  if (complete) {
    if (diff) {
      await pushBuildNotification({
        buildId: screenshotDiff.buildId,
        type: "diff-detected",
      });
    } else {
      await pushBuildNotification({
        buildId: screenshotDiff.buildId,
        type: "no-diff-detected",
      });
    }
  }
};
