import { invariant } from "@argos/util/invariant";
import type { S3Client } from "@aws-sdk/client-s3";
import * as Sentry from "@sentry/node";

import { MediaDiff } from "@/database/models";
import logger from "@/logger";
import { diffImages } from "@/screenshot-diff/diff/image";
import type { DiffResult } from "@/screenshot-diff/diff/types";
import { S3FileHandle } from "@/storage";
import { hashFileSha256 } from "@/util/hash";

import { getMediaDiffKey } from "./key";
import { headMediaObject } from "./object";

type MediaDiffContext = {
  s3: S3Client;
  bucket: string;
};

/**
 * Compute the mask between the two halves of a before/after pair, with the same
 * engine — and therefore the same thresholds and antialiasing handling — a
 * build's screenshots go through.
 *
 * The row it writes to is keyed on the two versions, so this never overwrites a
 * diff a reviewer might be looking at: a re-upload gets a row of its own. That
 * also makes the job safely re-runnable, which is what a queue needs.
 */
export async function computeMediaDiff(
  poorMediaDiff: MediaDiff,
  context: MediaDiffContext,
): Promise<void> {
  const mediaDiff = await poorMediaDiff
    .$query()
    .withGraphFetched("[beforeVersion, afterVersion.media]");

  const { beforeVersion, afterVersion } = mediaDiff;
  invariant(beforeVersion, "no before version");
  invariant(afterVersion, "no after version");
  invariant(
    beforeVersion.isImage() && afterVersion.isImage(),
    "a media diff is only ever scheduled for two images",
  );

  // The mask is stored under the project's own prefix, and a pair is always
  // within one project — the pairing tuple starts with it.
  const afterMedia = afterVersion.media;
  invariant(afterMedia, "no media on the after version");

  // Content-addressed keys, so the same key is the same bytes: identical halves
  // are answered without paying for two downloads and a compare.
  if (beforeVersion.key === afterVersion.key) {
    await MediaDiff.query().findById(mediaDiff.id).patch({
      score: 0,
      key: null,
      width: null,
      height: null,
    });
    return;
  }

  const beforeHandle = new S3FileHandle({
    ...context,
    key: beforeVersion.key,
    contentType: beforeVersion.mimeType,
  });
  const afterHandle = new S3FileHandle({
    ...context,
    key: afterVersion.key,
    contentType: afterVersion.mimeType,
  });

  const beforeImage = beforeHandle.getImageHandle();
  const afterImage = afterHandle.getImageHandle();
  invariant(beforeImage && afterImage, "both halves are images");

  try {
    const result = await diffImages(beforeImage, afterImage, {});

    const mask = result.file
      ? await uploadMediaDiffMask({
          projectId: afterMedia.projectId,
          resultFile: result.file,
          context,
        })
      : null;

    await MediaDiff.query()
      .findById(mediaDiff.id)
      .patch({
        score: result.score,
        key: mask?.key ?? null,
        width: mask?.width ?? null,
        height: mask?.height ?? null,
      });
  } finally {
    // In a `finally`, because the job retries: a pair the engine cannot handle
    // would otherwise leave both downloads on the worker's disk once per
    // attempt, with nothing that ever collects them.
    await Promise.all([discardFile(beforeHandle), discardFile(afterHandle)]);
  }
}

/**
 * Drop a handle's temporary file, reporting rather than raising.
 *
 * Cleanup runs on the failure path too, where the handle may be holding the very
 * error being propagated — a download that never completed rejects again here.
 * Letting that through would replace the real reason the job failed with a
 * cleanup error.
 */
async function discardFile(handle: S3FileHandle): Promise<void> {
  try {
    await handle.unlink();
  } catch (error) {
    logger.warn({ error }, "Failed to remove a media diff temporary file");
  }
}

/**
 * Store the mask and hand back what the row needs to point at it.
 *
 * No lock and no existence row: the key is the hash of the bytes, so two jobs
 * racing on the same mask write the same object, and an object already there is
 * byte-for-byte the one we were about to upload. The `HEAD` is only there to
 * skip re-uploading a mask Argos already has — a screenshot re-uploaded
 * unchanged across pull requests produces the same one every time.
 */
async function uploadMediaDiffMask(args: {
  projectId: string;
  resultFile: NonNullable<DiffResult["file"]>;
  context: MediaDiffContext;
}): Promise<{ key: string; width: number | null; height: number | null }> {
  const { projectId, resultFile, context } = args;
  return Sentry.startSpan(
    {
      name: "uploadMediaDiffMask",
      attributes: {
        "argos.diff.path": resultFile.path,
        "argos.diff.width": resultFile.width,
        "argos.diff.height": resultFile.height,
      },
    },
    async () => {
      const hash = await hashFileSha256(resultFile.path);
      const key = getMediaDiffKey({ projectId, hash });
      const fileHandle = new S3FileHandle({
        ...context,
        key,
        filepath: resultFile.path,
        contentType: resultFile.contentType,
      });

      const existing = await headMediaObject(key);
      if (!existing) {
        await fileHandle.upload();
      }

      await fileHandle.unlink();

      return {
        key,
        width: resultFile.width ?? null,
        height: resultFile.height ?? null,
      };
    },
  );
}
