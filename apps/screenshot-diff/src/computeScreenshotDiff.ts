import type { S3Client } from "@aws-sdk/client-s3";
import { rmdir } from "node:fs/promises";
import type { TransactionOrKnex } from "objection";
import tmp from "tmp";

import { pushBuildNotification } from "@argos-ci/build-notification";
import { raw, transaction } from "@argos-ci/database";
import { File, ScreenshotDiff } from "@argos-ci/database/models";
import { S3Image } from "@argos-ci/storage";

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

async function patchMissingFileDimensions({
  s3Image,
  fileId,
  trx,
}: {
  s3Image: S3Image;
  fileId: String | undefined;
  trx?: TransactionOrKnex;
}) {
  if (!fileId) return;

  const { width, height } = await s3Image.getDimensions();
  if (width && height) return;

  await s3Image.measureDimensions();
  const measuredDimensions = await s3Image.getDimensions();
  await File.query(trx)
    .findById(fileId as string)
    .patch(measuredDimensions);
}

export const computeScreenshotDiff = async (
  screenshotDiff: ScreenshotDiff,
  { s3, bucket }: { s3: S3Client; bucket: string }
) => {
  await transaction(async (trx) => {
    screenshotDiff = await screenshotDiff
      .$query(trx)
      .withGraphFetched("[build, baseScreenshot.file, compareScreenshot.file]");

    if (!screenshotDiff) {
      throw new Error(`Screenshot diff id: \`${screenshotDiff}\` not found`);
    }

    const tmpDir = await createTmpDirectory();

    const baseImage = new S3Image({
      s3,
      bucket: bucket,
      key: screenshotDiff.baseScreenshot?.s3Id,
      filePath: `${tmpDir}/base`,
      width: screenshotDiff.baseScreenshot?.file?.width || null,
      height: screenshotDiff.baseScreenshot?.file?.height || null,
    });

    const compareImage = new S3Image({
      s3,
      bucket,
      key: screenshotDiff.compareScreenshot!.s3Id,
      filePath: `${tmpDir}/compare`,
      width: screenshotDiff.compareScreenshot?.file?.width || null,
      height: screenshotDiff.compareScreenshot?.file?.height || null,
    });

    const diffImage = new S3Image({
      s3,
      bucket: bucket,
      filePath: `${tmpDir}/diff.png`,
    });

    await Promise.all([baseImage.download(), compareImage.download()]);
    await Promise.all([
      patchMissingFileDimensions({
        fileId: screenshotDiff.baseScreenshot?.fileId,
        s3Image: baseImage,
        trx,
      }),
      patchMissingFileDimensions({
        fileId: screenshotDiff.compareScreenshot!.fileId,
        s3Image: compareImage,
        trx,
      }),
    ]);

    let patchProps = {};
    const shouldCompareScreenshot =
      screenshotDiff.baseScreenshot &&
      screenshotDiff.baseScreenshot.s3Id !==
        screenshotDiff.compareScreenshot!.s3Id;

    if (shouldCompareScreenshot) {
      const diffResult = await diffImages({
        baseImage,
        compareImage,
        diffImage,
      });

      if (diffResult.score > 0) {
        const uploadResult = await diffImage.upload();
        const diffFile = await File.query(trx)
          .insert({
            key: uploadResult!.Key,
            width: diffResult.width,
            height: diffResult.height,
          })
          .returning("*");
        patchProps = {
          score: diffResult.score,
          s3Id: diffFile.key,
          fileId: diffFile.id,
        };
      }
    }

    await ScreenshotDiff.query(trx)
      .findById(screenshotDiff.id)
      .patch({ jobStatus: "complete", ...patchProps });

    await Promise.all([
      baseImage.unlink(),
      compareImage.unlink(),
      diffImage.unlink(),
    ]);

    await rmdir(tmpDir);

    // @ts-ignore
    const [{ complete, diff }] = await ScreenshotDiff.query(trx)
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
          trx,
        });
      } else {
        await pushBuildNotification({
          buildId: screenshotDiff.buildId,
          type: "no-diff-detected",
          trx,
        });
      }
    }
  });
};
