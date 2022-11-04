import type { S3Client } from "@aws-sdk/client-s3";
import { rmdir, unlink } from "node:fs/promises";
import { join } from "node:path";
import tmp from "tmp";

import { pushBuildNotification } from "@argos-ci/build-notification";
import { raw } from "@argos-ci/database";
import { File, ScreenshotDiff } from "@argos-ci/database/models";
import { download, upload } from "@argos-ci/storage";

import { getImageSize } from "./util/image-diff/imageDifference.js";
import { diffImages } from "./util/image-diff/index.js";

function createTmpDirectory() {
  return new Promise<string>((resolve, reject) => {
    tmp.dir((err, path) => {
      if (err) {
        reject(err);
      } else {
        resolve(path);
      }
    });
  });
}

export const computeScreenshotDiff = async (
  screenshotDiff: ScreenshotDiff,
  { s3, bucket }: { s3: S3Client; bucket: string }
) => {
  screenshotDiff = await screenshotDiff
    .$query()
    .withGraphFetched("[build, baseScreenshot.file, compareScreenshot.file]");

  if (!screenshotDiff) {
    throw new Error(`Screenshot diff id: \`${screenshotDiff}\` not found`);
  }

  const tmpDir = await createTmpDirectory();
  const baseScreenshotPath = join(tmpDir, "base");
  const compareScreenshotPath = join(tmpDir, "compare");
  const diffResultPath = join(tmpDir, "diff.png");

  await Promise.all([
    ...(screenshotDiff.baseScreenshot
      ? [
          download({
            s3,
            outputPath: baseScreenshotPath,
            Bucket: bucket,
            Key: screenshotDiff.baseScreenshot!.s3Id,
          }),
        ]
      : []),
    download({
      s3,
      outputPath: compareScreenshotPath,
      Bucket: bucket,
      Key: screenshotDiff.compareScreenshot!.s3Id,
    }),
  ]);

  await Promise.all(
    [
      { ...screenshotDiff.baseScreenshot, filePath: baseScreenshotPath },
      { ...screenshotDiff.compareScreenshot, filePath: compareScreenshotPath },
    ]
      .filter(
        (screenshot) =>
          screenshot &&
          screenshot.fileId &&
          screenshot.file &&
          (screenshot.file.width === undefined ||
            screenshot.file.height === undefined)
      )
      .map(async (screenshot) => {
        const { width, height } = await getImageSize(screenshot.filePath);
        await File.query()
          .findById(screenshot.fileId as string)
          .patch({ width, height });
      })
  );

  if (
    !screenshotDiff.baseScreenshot ||
    (screenshotDiff.compareScreenshot!.fileId !== null &&
      screenshotDiff.baseScreenshot!.fileId ===
        screenshotDiff.compareScreenshot!.fileId)
  ) {
    await ScreenshotDiff.query().findById(screenshotDiff.id).patch({
      jobStatus: "complete",
    });
    return;
  }

  const difference = await diffImages({
    actualFilename: compareScreenshotPath,
    expectedFilename: baseScreenshotPath,
    diffFilename: diffResultPath,
  });

  let file = null;
  if (difference.score > 0) {
    const uploadResult = await upload({
      s3,
      Bucket: bucket,
      inputPath: diffResultPath,
    });
    file = await File.query()
      .insert({
        key: uploadResult.Key,
        width: difference.width,
        height: difference.height,
      })
      .returning("*");
  }

  await Promise.all([
    unlink(compareScreenshotPath),
    unlink(baseScreenshotPath),
    unlink(diffResultPath),
  ]);

  await rmdir(tmpDir);

  await ScreenshotDiff.query()
    .findById(screenshotDiff.id)
    .patch({
      score: difference.score,
      jobStatus: "complete",
      s3Id: file ? file.key : null,
      fileId: file ? file.id : null,
    });

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
