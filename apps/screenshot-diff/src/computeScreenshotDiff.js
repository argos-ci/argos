import path from "path";
import { promisify } from "util";
import { rmdir, unlink } from "fs";
import tmp from "tmp";
import { pushBuildNotification } from "@argos-ci/build-notification";
import { ScreenshotDiff } from "@argos-ci/database/models";
import { download, upload } from "@argos-ci/storage";
import { diffImages } from "./util/image-diff";
import { raw } from "../../database/src";

const rmdirAsync = promisify(rmdir);
const unlinkAsync = promisify(unlink);

function createTmpDirectory() {
  return new Promise((resolve, reject) => {
    tmp.dir((err, path) => {
      if (err) {
        reject(err);
      } else {
        resolve(path);
      }
    });
  });
}

export async function computeScreenshotDiff(screenshotDiff, { s3, bucket }) {
  screenshotDiff = await screenshotDiff
    .$query()
    .withGraphFetched("[build, baseScreenshot, compareScreenshot]");

  if (!screenshotDiff) {
    throw new Error(`Screenshot diff id: \`${screenshotDiff}\` not found`);
  }

  const tmpDir = await createTmpDirectory();
  const baseScreenshotPath = path.join(tmpDir, "base");
  const compareScreenshotPath = path.join(tmpDir, "compare");
  const diffResultPath = path.join(tmpDir, "diff.png");

  await Promise.all([
    download({
      s3,
      outputPath: baseScreenshotPath,
      Bucket: bucket,
      Key: screenshotDiff.baseScreenshot.s3Id,
    }),
    download({
      s3,
      outputPath: compareScreenshotPath,
      Bucket: bucket,
      Key: screenshotDiff.compareScreenshot.s3Id,
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
    unlinkAsync(compareScreenshotPath),
    unlinkAsync(baseScreenshotPath),
    unlinkAsync(diffResultPath),
  ]);

  await rmdirAsync(tmpDir);

  await ScreenshotDiff.query()
    .findById(screenshotDiff.id)
    .patch({
      score: difference.score,
      s3Id: uploadResult ? uploadResult.Key : null,
    });

  const [{ complete, diff }] = await ScreenshotDiff.query()
    .select(
      raw("bool_and(score is not null) as complete"),
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
}
