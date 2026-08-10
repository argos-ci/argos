import { DeleteObjectsCommand, HeadObjectCommand } from "@aws-sdk/client-s3";

import config from "@/config";
import { MediaVersion } from "@/database/models";
import { getS3Client } from "@/storage/s3";

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
 * Private on purpose — every caller goes through
 * {@link deleteUnreferencedMediaObjects}, so none of them can forget the
 * shared-key check.
 */
async function deleteMediaObjects(keys: string[]): Promise<void> {
  const unique = [...new Set(keys)].filter(Boolean);
  if (unique.length === 0) {
    return;
  }
  await getS3Client().send(
    new DeleteObjectsCommand({
      Bucket: config.get("s3.screenshotsBucket"),
      Delete: { Objects: unique.map((Key) => ({ Key })), Quiet: true },
    }),
  );
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

  const inUse = await findReferencedKeys({
    keys,
    excludeVersionIds: args.excludeVersionIds,
  });

  await deleteMediaObjects(keys.filter((key) => !inUse.has(key)));
}

/** Which of these keys some other version still points at. */
async function findReferencedKeys(args: {
  keys: string[];
  excludeVersionIds: string[];
}): Promise<Set<string>> {
  const query = MediaVersion.query().select("key").whereIn("key", args.keys);

  if (args.excludeVersionIds.length > 0) {
    query.whereNotIn("id", args.excludeVersionIds);
  }

  const rows = await query;
  return new Set(rows.map((row) => row.key));
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
