import { fingerprintDiff } from "@argos-ci/mask-fingerprint";
import { invariant } from "@argos/util/invariant";
import type { S3Client } from "@aws-sdk/client-s3";
import type { TransactionOrKnex } from "objection";

import { concludeBuild } from "@/build/concludeBuild";
import { knex, transaction } from "@/database";
import {
  AuditTrail,
  File,
  IgnoredChange,
  Screenshot,
  ScreenshotDiff,
  type ProjectAutoIgnore,
} from "@/database/models";
import { upsertTestStats } from "@/metrics/test";
import { S3FileHandle, type ImageHandle } from "@/storage";
import { getArgosBotUserId } from "@/util/argos-bot";
import { chunk } from "@/util/chunk";
import { hashFileSha256 } from "@/util/hash";
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
      "[build.project, baseScreenshot.file, compareScreenshot.[file, screenshotBucket]]",
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

  const ignoredChange =
    diffFile && !diffFile.isCreated
      ? await IgnoredChange.query().select("fingerprint").findOne({
          projectId: build.projectId,
          testId: screenshotDiff.testId,
          fingerprint: diffFile.fingerprint,
        })
      : null;
  let ignored = Boolean(ignoredChange);

  if (screenshotDiff.testId && build.type === "reference") {
    await upsertTestStats({
      testId: screenshotDiff.testId,
      date: new Date(screenshotDiff.createdAt),
      change: diffFile
        ? {
            fileId: diffFile.file.id,
            fingerprint: diffFile.fingerprint,
          }
        : null,
    });

    if (!ignored && diffFile && build.project?.autoIgnore) {
      const [shouldIgnore, latestActionIsManualUnignore] = await Promise.all([
        shouldAutoIgnoreChange({
          autoIgnore: build.project.autoIgnore,
          testId: screenshotDiff.testId,
          projectId: build.projectId,
          fingerprint: diffFile.fingerprint,
        }),
        getLatestActionIsManualUnignore({
          projectId: build.projectId,
          testId: screenshotDiff.testId,
          fingerprint: diffFile.fingerprint,
        }),
      ]);

      if (shouldIgnore && !latestActionIsManualUnignore) {
        await insertAutoIgnoredChange({
          projectId: build.projectId,
          testId: screenshotDiff.testId,
          fingerprint: diffFile.fingerprint,
        });
        ignored = true;
      }
    }
  }

  // Unlink files
  await Promise.all([baseFileHandle?.unlink(), headFileHandle.unlink()]);

  // It is problematic to have to do that to conclude the build
  // we should never have to patch jobStatus to complete while the job is not complete
  // we should probably use another key to check if the diff has been computed.
  await ScreenshotDiff.query()
    .findById(screenshotDiff.id)
    .patch({
      score: result?.score ?? null,
      ignored,
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
  ]);
}

async function shouldAutoIgnoreChange(args: {
  autoIgnore: ProjectAutoIgnore;
  projectId: string;
  testId: string;
  fingerprint: string;
}) {
  const result = await knex("test_stats_fingerprints")
    .where("testId", args.testId)
    .where("fingerprint", args.fingerprint)
    .where("date", ">=", knex.raw("now() - interval '7 days'"))
    .sum<{ total: string | number | null }>({ total: "value" })
    .first();

  const totalChanges = Number(result?.total ?? 0);
  return totalChanges >= args.autoIgnore.changes;
}

async function getLatestActionIsManualUnignore(args: {
  projectId: string;
  testId: string;
  fingerprint: string;
}) {
  const latestAction = await knex("audit_trails")
    .join("users", "users.id", "audit_trails.userId")
    .select("audit_trails.action", "users.type as userType")
    .where("audit_trails.projectId", args.projectId)
    .where("audit_trails.testId", args.testId)
    .where("audit_trails.fingerprint", args.fingerprint)
    .whereIn("audit_trails.action", ["files.ignored", "files.unignored"])
    .orderBy("audit_trails.date", "desc")
    .orderBy("audit_trails.id", "desc")
    .first<{ action: AuditTrail["action"]; userType: "user" | "bot" }>();

  return (
    latestAction?.action === "files.unignored" &&
    latestAction.userType === "user"
  );
}

async function insertAutoIgnoredChange(args: {
  projectId: string;
  testId: string;
  fingerprint: string;
}) {
  const botUserId = await getArgosBotUserId();
  return transaction(async (trx) => {
    const existingIgnoredChange = await IgnoredChange.query(trx).findOne(args);
    if (existingIgnoredChange) {
      return false;
    }

    await Promise.all([
      IgnoredChange.query(trx).insert(args),
      AuditTrail.query(trx).insert({
        date: new Date().toISOString(),
        projectId: args.projectId,
        testId: args.testId,
        userId: botUserId,
        fingerprint: args.fingerprint,
        action: "files.ignored",
      }),
    ]);

    return true;
  });
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
  const key = await hashFileSha256(resultFile.path);
  const { file, isCreated, fingerprint } = await getOrCreateDiffFile({
    key,
    resultFile,
    context,
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
  resultFile: NonNullable<DiffResult["file"]>;
  context: ComputeDiffContext;
}): Promise<{ isCreated: boolean; file: File; fingerprint: string }> {
  const { key, resultFile, context } = args;
  const fileHandle = new S3FileHandle({
    ...context,
    key,
    filepath: resultFile.path,
    contentType: resultFile.contentType,
  });
  const existing = await File.query().findOne({ key });
  const fingerprint =
    existing?.fingerprint ?? (await fingerprintDiff(resultFile.path));
  const { file, isCreated } = await (async () => {
    if (!existing) {
      const file = await lockAndUploadDiffFile({
        fileHandle,
        key,
        contentType: resultFile.contentType,
        width: resultFile.width,
        height: resultFile.height,
        fingerprint,
      });
      return { file, fingerprint, isCreated: true };
    }

    if (!existing.fingerprint) {
      await File.query().findById(existing.id).patch({ fingerprint });
      existing.fingerprint = fingerprint;
    }

    return { file: existing, fingerprint, isCreated: false };
  })();

  await fileHandle.unlink();
  return { file, fingerprint, isCreated };
}
