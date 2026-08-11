import { DeleteObjectsCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import type { TransactionOrKnex } from "objection";

import config from "@/config";
import { MediaDiff, MediaVersion } from "@/database/models";
import { getS3Client } from "@/storage/s3";
import { chunk } from "@/util/chunk";

/**
 * Read an uploaded object's metadata, or `null` when it isn't there.
 *
 * A missing object is a normal answer — the caller finalized before the upload
 * finished, or the same bytes have never been uploaded before — not an error.
 */
export async function headMediaObject(
  key: string,
): Promise<{ size: number; contentType: string | null } | null> {
  try {
    const result = await getS3Client().send(
      new HeadObjectCommand({
        Bucket: config.get("s3.screenshotsBucket"),
        Key: key,
      }),
    );
    return {
      size: result.ContentLength ?? 0,
      contentType: result.ContentType ?? null,
    };
  } catch (error) {
    if (isNotFoundError(error)) {
      return null;
    }
    throw error;
  }
}

/**
 * Delete media objects from storage.
 *
 * Tolerates keys that are already gone: the purge job and an explicit delete can
 * both reach the same media, and S3 reports a missing key as a successful delete
 * anyway.
 *
 * Chunked because `DeleteObjects` refuses more than 1000 keys per call — and a
 * project being deleted, or a purge batch of long screenshots, reaches that.
 *
 * Private on purpose — every caller goes through
 * {@link deleteUnreferencedMediaObjects} or
 * {@link deleteUnreferencedMediaDiffObjects}, so none of them can forget the
 * shared-key check.
 */
async function deleteMediaObjects(keys: string[]): Promise<void> {
  const unique = [...new Set(keys)].filter(Boolean);
  if (unique.length === 0) {
    return;
  }
  for (const batch of chunk(unique, S3_DELETE_BATCH_SIZE)) {
    await getS3Client().send(
      new DeleteObjectsCommand({
        Bucket: config.get("s3.screenshotsBucket"),
        Delete: { Objects: batch.map((Key) => ({ Key })), Quiet: true },
      }),
    );
  }
}

/** What one `DeleteObjects` call accepts. */
const S3_DELETE_BATCH_SIZE = 1000;

/**
 * Delete the objects among these keys that nothing points at any more.
 *
 * The shared body of both delete paths, because getting it wrong is silent
 * either way round: delete an object something still references and the row
 * looks fine with its bytes gone; keep one nothing references and it is paid for
 * forever. `findReferenced` is the only part that differs — which table still
 * claims a key.
 */
async function deleteUnreferencedObjects(args: {
  keys: (string | null | undefined)[];
  findReferenced: (keys: string[]) => Promise<Set<string>>;
}): Promise<void> {
  const keys = [
    ...new Set(
      args.keys.filter(
        (key): key is string => typeof key === "string" && key.length > 0,
      ),
    ),
  ];

  if (keys.length === 0) {
    return;
  }

  const inUse = await args.findReferenced(keys);

  await deleteMediaObjects(keys.filter((key) => !inUse.has(key)));
}

/**
 * Delete media objects, keeping any that another version still serves.
 *
 * Keys are content-addressed and namespaced per project, so the same file
 * uploaded twice gets two version rows pointing at one object. Versions make this
 * routine rather than a corner case: reverting a screenshot to what it was two
 * uploads ago produces a new version with an already-stored key. Deleting the
 * object because one version went away would break the others, and nothing would
 * ever notice — the surviving rows still look fine, their bytes are simply gone.
 *
 * Every path that removes bytes goes through here: an explicit delete, a rejected
 * upload, and the retention purge.
 */
export async function deleteUnreferencedMediaObjects(args: {
  keys: (string | null | undefined)[];
  /** Versions whose references don't count — the rows being deleted. */
  excludeVersionIds: string[];
}): Promise<void> {
  await deleteUnreferencedObjects({
    keys: args.keys,
    findReferenced: async (keys) => {
      const query = MediaVersion.query().select("key").whereIn("key", keys);

      if (args.excludeVersionIds.length > 0) {
        query.whereNotIn("id", args.excludeVersionIds);
      }

      return new Set((await query).map((row) => row.key));
    },
  });
}

/**
 * Delete before/after diff masks, keeping any that another pair still shows.
 *
 * The same hazard as {@link deleteUnreferencedMediaObjects}: mask keys are
 * content-addressed too, so a pair that changed in exactly the way another pair
 * did shares one object. These bytes are derived rather than uploaded, so
 * nothing regenerates them on demand — deleting one another pair still points at
 * would leave that pair showing a broken overlay.
 */
export async function deleteUnreferencedMediaDiffObjects(args: {
  keys: (string | null | undefined)[];
  /** Diffs whose references don't count — the rows being deleted. */
  excludeDiffIds: string[];
}): Promise<void> {
  await deleteUnreferencedObjects({
    keys: args.keys,
    findReferenced: async (keys) => {
      const query = MediaDiff.query().select("key").whereIn("key", keys);

      if (args.excludeDiffIds.length > 0) {
        query.whereNotIn("id", args.excludeDiffIds);
      }

      // `whereIn` over non-null keys can only match non-null rows; the column is
      // nullable, so the compiler has to be told.
      return new Set(
        (await query)
          .map((row) => row.key)
          .filter((key): key is string => key !== null),
      );
    },
  });
}

/**
 * The masks computed from these versions, and the rows naming them.
 *
 * Every path that deletes a media version has to collect these *first*: the
 * `media_diffs` rows cascade off the foreign key, so once the versions are gone
 * nothing names the objects any more and no later pass can find them. Callers
 * hand the result to {@link deleteUnreferencedMediaDiffObjects}.
 */
export async function getMediaDiffObjects(
  versionIds: string[],
  trx?: TransactionOrKnex,
): Promise<{ keys: string[]; diffIds: string[] }> {
  if (versionIds.length === 0) {
    return { keys: [], diffIds: [] };
  }

  const diffs = await MediaDiff.query(trx)
    .select("id", "key")
    .whereNotNull("key")
    .where((builder) => {
      builder
        .whereIn("beforeMediaVersionId", versionIds)
        .orWhereIn("afterMediaVersionId", versionIds);
    });

  return {
    keys: diffs.map((diff) => diff.key).filter((key) => key !== null),
    diffIds: diffs.map((diff) => diff.id),
  };
}

function isNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  if ("name" in error && error.name === "NotFound") {
    return true;
  }
  // A bucket without `s3:ListBucket` answers 403 for a missing key rather than
  // 404 — indistinguishable from absent, and treated as such.
  return (
    "$metadata" in error &&
    typeof error.$metadata === "object" &&
    error.$metadata !== null &&
    "httpStatusCode" in error.$metadata &&
    (error.$metadata.httpStatusCode === 404 ||
      error.$metadata.httpStatusCode === 403)
  );
}
