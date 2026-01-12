import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fingerprintDiff } from "@argos-ci/mask-fingerprint";
import { invariant } from "@argos/util/invariant";
import type { S3Client } from "@aws-sdk/client-s3";
import type { TransactionOrKnex } from "objection";

import { concludeBuild } from "@/build/concludeBuild";
import { transaction } from "@/database";
import {
  File,
  IgnoredFile,
  Screenshot,
  ScreenshotDiff,
} from "@/database/models";
import { upsertTestStats } from "@/metrics/test";
import { S3FileHandle, type ImageHandle } from "@/storage";
import { chunk } from "@/util/chunk";
import { redisLock } from "@/util/redis";

import { diffImages } from "./diff/image";
import { diffTexts } from "./diff/text";
import type { DiffOptions, DiffResult } from "./diff/types";

type ComputeDiffContext = {
  s3: S3Client;
  bucket: string;
};

/**
 * Computes the screenshot difference
 */
export async function computeScreenshotDiff(
  poorScreenshotDiff: ScreenshotDiff,
  context: ComputeDiffContext,
) {
  if (poorScreenshotDiff.jobStatus === "complete") {
    return;
  }

  const screenshotDiff = await poorScreenshotDiff
    .$query()
    .withGraphFetched(
      "[build, baseScreenshot.file, compareScreenshot.[file, screenshotBucket]]",
    );

  const {
    baseScreenshot,
    compareScreenshot: headScreenshot,
    build,
  } = screenshotDiff;

  invariant(build, "no build");
  invariant(headScreenshot, "no head screenshot");
  invariant(screenshotDiff.testId, "no testId on screenshotDiff");

  const baseFileHandle = baseScreenshot
    ? new S3FileHandle({
        ...context,
        key: baseScreenshot.s3Id,
        contentType: baseScreenshot.file?.contentType ?? "image/png",
      })
    : null;

  const headFileHandle = new S3FileHandle({
    ...context,
    key: headScreenshot.s3Id,
    contentType: headScreenshot.file?.contentType ?? "image/png",
  });

  const baseImage = baseFileHandle?.getImageHandle();
  const headImage = headFileHandle.getImageHandle();

  const { buildId } = screenshotDiff;

  // Patching cannot be done in parallel since the file can be the same and must be created only
  if (baseImage) {
    invariant(baseScreenshot, "no base screenshot");
    await ensureImageDimensions({
      screenshot: baseScreenshot,
      imageHandle: baseImage,
    });
  }

  if (headImage) {
    await ensureImageDimensions({
      screenshot: headScreenshot,
      imageHandle: headImage,
    });
  }

  const result = baseFileHandle
    ? await diffFiles(baseFileHandle, headFileHandle, {
        threshold: headScreenshot.threshold ?? undefined,
      })
    : null;

  const diffFile = result?.file
    ? await processDiffResultFile(result.file, context)
    : null;

  const ignoredFile =
    diffFile && !diffFile.isCreated
      ? await IgnoredFile.query().select("fileId").findOne({
          fileId: diffFile.file.id,
          projectId: build.projectId,
          testId: screenshotDiff.testId,
        })
      : null;

  // Unlink files
  await Promise.all([baseFileHandle?.unlink(), headFileHandle.unlink()]);

  // It is problematic to have to do that to conclude the build
  // we should never have to patch jobStatus to complete while the job is not complete
  // we should probably use another key to check if the diff has been computed.
  await ScreenshotDiff.query()
    .findById(screenshotDiff.id)
    .patch({
      score: result?.score ?? null,
      ignored: Boolean(ignoredFile),
      s3Id: diffFile ? diffFile.file.key : null,
      fileId: diffFile ? diffFile.file.id : null,
      fingerprint: diffFile ? diffFile.fingerprint : null,
      jobStatus: "complete",
    });

  await Promise.all([
    // Conclude the build
    concludeBuild({ build }),
    // Group similar diffs
    (async () => {
      if (diffFile) {
        await redisLock.acquire(["diff-group", diffFile.file.key], async () => {
          await groupSimilarDiffs({
            fingerprint: diffFile.fingerprint,
            buildId,
          });
        });
      }
    })(),
    // Insert stats
    (async () => {
      if (screenshotDiff.testId && build.type === "reference") {
        await upsertTestStats({
          testId: screenshotDiff.testId,
          date: new Date(screenshotDiff.createdAt),
          fileId: diffFile ? diffFile.file.id : null,
        });
      }
    })(),
  ]);
}

/**
 * Compute the diff between two files.
 */
async function diffFiles(
  base: S3FileHandle,
  head: S3FileHandle,
  options: DiffOptions,
) {
  if (base.getKey() === head.getKey()) {
    return { score: 0 };
  }

  const headImage = head.getImageHandle();
  const baseImage = base.getImageHandle();

  // If the two types are different, then we consider there is a diff
  if (Boolean(headImage) !== Boolean(baseImage)) {
    return { score: 1 };
  }

  // If we are comparing images.
  if (headImage) {
    invariant(baseImage, "baseImage should exist");
    return diffImages(baseImage, headImage, options);
  }

  // Else we compare files as text.
  return diffTexts(base, head);
}

/**
 * Process the diff result file and create the diff file record.
 */
async function processDiffResultFile(
  resultFile: NonNullable<DiffResult["file"]>,
  context: ComputeDiffContext,
): Promise<{ file: File; isCreated: boolean; fingerprint: string }> {
  const buffer = await readFile(resultFile.path);
  const key = await hashBuffer(buffer);
  const { file, isCreated, fingerprint } = await getOrCreateDiffFile({
    key,
    resultFile,
    context,
    buffer,
  });
  return { file, isCreated, fingerprint };
}

/**
 * Group similar diffs by file key.
 */
async function groupSimilarDiffs(input: {
  fingerprint: string;
  buildId: string;
}) {
  const { fingerprint, buildId } = input;
  const similarDiffs = await ScreenshotDiff.query().where({
    buildId,
    group: null,
    fingerprint,
  });

  // Patch group on screenshot diffs
  if (similarDiffs.length > 1) {
    const diffIds = similarDiffs.map(({ id }) => id);

    const diffIdsChunks = chunk(diffIds, 50);

    for (const diffIdsChunk of diffIdsChunks) {
      // Update diffs
      // We don't do the where in this query because of deadlock issues
      // Having `s3Id` in the where clause causes a deadlock
      await ScreenshotDiff.query()
        .whereIn("id", diffIdsChunk)
        .patch({ group: fingerprint });
    }

    return fingerprint;
  }

  return null;
}

/**
 * Hash the buffer using SHA-256.
 */
async function hashBuffer(buffer: Buffer): Promise<string> {
  return createHash("sha256").update(buffer).digest("hex");
}

/**
 * Get or create a file record in the database.
 */
async function getOrCreateFile(
  values: {
    key: string;
    type: File["type"];
    contentType: string;
    width?: number | null;
    height?: number | null;
  },
  trx: TransactionOrKnex,
) {
  const file = await File.query(trx).findOne({ key: values.key });
  if (file) {
    return file;
  }

  return File.query(trx).insert(values).returning("*");
}

/**
 * Ensures that the associated file of the screenshot has dimensions.
 */
async function ensureImageDimensions(args: {
  imageHandle: ImageHandle;
  screenshot: Screenshot;
}) {
  const { imageHandle, screenshot } = args;

  if (screenshot?.file?.width != null && screenshot?.file?.height != null) {
    return;
  }

  const dimensions = await imageHandle.getDimensions();
  if (screenshot.fileId) {
    await File.query().findById(screenshot.fileId).patch(dimensions);
    return;
  }

  await transaction(async (trx) => {
    const file = await getOrCreateFile(
      {
        key: screenshot.s3Id,
        type: "screenshot",
        contentType: "image/png",
        ...dimensions,
      },
      trx,
    );
    await Screenshot.query(trx)
      .findById(screenshot.id)
      .patch({ fileId: file.id });
  });
}

/**
 * Uploads the diff file with a lock to avoid concurrency issues.
 */
async function lockAndUploadDiffFile(args: {
  fileHandle: S3FileHandle;
  key: string;
  contentType: string;
  width: number | undefined;
  height: number | undefined;
  fingerprint: string;
}) {
  return redisLock.acquire(["diff-upload", args.key], async () => {
    // Check if the diff file has been uploaded by another process
    const existingDiffFile = await File.query().findOne({ key: args.key });
    if (existingDiffFile) {
      return existingDiffFile;
    }

    await args.fileHandle.upload();

    return File.query()
      .insert({
        key: args.key,
        width: args.width ?? null,
        height: args.height ?? null,
        contentType: args.contentType,
        type: "screenshotDiff",
        fingerprint: args.fingerprint,
      })
      .returning("*");
  });
}

/**
 * Processes the diff result. Returns the existing file if found.
 * If not, uploads the new diff using a lock to avoid concurrency issues.
 */
async function getOrCreateDiffFile(args: {
  key: string;
  buffer: Buffer;
  resultFile: NonNullable<DiffResult["file"]>;
  context: ComputeDiffContext;
}): Promise<{ isCreated: boolean; file: File; fingerprint: string }> {
  const { key, buffer, resultFile, context } = args;
  const fileHandle = new S3FileHandle({
    ...context,
    key,
    filepath: resultFile.path,
    contentType: resultFile.contentType,
  });
  const existing = await File.query().findOne({ key });
  const isCreated = !existing;
  if (!existing) {
    const fingerprint = await fingerprintDiff(buffer);
    const file = await lockAndUploadDiffFile({
      fileHandle,
      key,
      contentType: resultFile.contentType,
      width: resultFile.width,
      height: resultFile.height,
      fingerprint,
    });
    await fileHandle.unlink();
    return { file, fingerprint, isCreated };
  }
  if (!existing.fingerprint) {
    const fingerprint = await fingerprintDiff(buffer);
    await File.query().findById(existing.id).patch({ fingerprint });
    existing.fingerprint = fingerprint;
    await fileHandle.unlink();
    return { file: existing, fingerprint, isCreated };
  }
  await fileHandle.unlink();
  return {
    file: existing,
    fingerprint: existing.fingerprint,
    isCreated,
  };
}
