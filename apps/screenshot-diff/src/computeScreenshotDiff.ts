import type { S3Client } from "@aws-sdk/client-s3";
import { rmdir, unlink } from "node:fs/promises";
import { join } from "node:path";
import tmp from "tmp";

import { pushBuildNotification } from "@argos-ci/build-notification";
import { raw } from "@argos-ci/database";
import { ScreenshotDiff } from "@argos-ci/database/models";
import { download, upload } from "@argos-ci/storage";

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
    .withGraphFetched("[build, baseScreenshot, compareScreenshot]");

  if (!screenshotDiff) {
    throw new Error(`Screenshot diff id: \`${screenshotDiff}\` not found`);
  }

  const tmpDir = await createTmpDirectory();
  const baseScreenshotPath = join(tmpDir, "base");
  const compareScreenshotPath = join(tmpDir, "compare");
  const diffResultPath = join(tmpDir, "diff.png");

  await Promise.all([
    download({
      s3,
      outputPath: baseScreenshotPath,
      Bucket: bucket,
      Key: screenshotDiff.baseScreenshot!.s3Id,
    }),
    download({
      s3,
      outputPath: compareScreenshotPath,
      Bucket: bucket,
      Key: screenshotDiff.compareScreenshot!.s3Id,
    }),
  ]);

  const difference = await diffImages({
    actualFilename: compareScreenshotPath,
    expectedFilename: baseScreenshotPath,
    diffFilename: diffResultPath,
  });

  let uploadResult = null;
  if (difference.score > 0) {
    uploadResult = await upload({
      s3,
      Bucket: bucket,
      inputPath: diffResultPath,
    });
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
      s3Id: uploadResult ? uploadResult.Key : null,
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
