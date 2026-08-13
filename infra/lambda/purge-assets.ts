import {
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  type _Object,
  S3Client,
} from "@aws-sdk/client-s3";

/**
 * Retention for the frontend asset bucket.
 *
 * The bucket is append-only during a deploy: assets are uploaded before
 * anything serves HTML naming them, and nothing is ever removed as part of a
 * release. That is what lets a rolling deploy — and a rollback to an older
 * image — keep working, since every recent build's chunks stay reachable no
 * matter which ECS task answers.
 *
 * Something still has to reclaim the space, and the rule matters. A chunk whose
 * content is unchanged keeps its hash across builds, so `aws s3 sync` skips
 * re-uploading it and its S3 creation date never moves. An S3 lifecycle rule —
 * the obvious choice — would therefore expire files that today's HTML still
 * references. Retention has to be driven by the age of the *build* that last
 * named a key, not the age of the object.
 *
 * So each deploy writes `manifests/<sha>.json` listing the keys it published.
 * This job keeps the union of every manifest inside the window and deletes the
 * rest.
 */

const BUCKET = requireEnv("BUCKET");
const ASSET_PREFIX = "assets/";
const MANIFEST_PREFIX = "manifests/";
const RETENTION_DAYS = Number(process.env["RETENTION_DAYS"] ?? "30");

/**
 * Floor on how new an object can be and still be considered for deletion.
 *
 * A deploy uploads its assets and *then* writes its manifest. In that window
 * the new chunks are named by no manifest at all, so a purge running at the
 * wrong moment would delete the build that is about to go live. Nothing this
 * young is ever touched, whatever the manifests say.
 */
const MIN_AGE_DAYS = 1;

const DAY_MS = 24 * 60 * 60 * 1000;

const s3 = new S3Client({});

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/** Every object under a prefix, following pagination to the end. */
async function listObjects(prefix: string): Promise<_Object[]> {
  const objects: _Object[] = [];
  let continuationToken: string | undefined;
  do {
    const response = await s3.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    );
    objects.push(...(response.Contents ?? []));
    continuationToken = response.NextContinuationToken;
  } while (continuationToken);
  return objects;
}

/**
 * Keys named by a manifest, or null when it cannot be read or parsed.
 *
 * A manifest that fails to parse must not narrow the keep-set — that would
 * delete live assets on the strength of a corrupt file — so the caller treats
 * null as a reason to abort rather than as an empty list.
 */
async function readManifestKeys(key: string): Promise<string[] | null> {
  try {
    const response = await s3.send(
      new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    );
    const body = await response.Body?.transformToString();
    if (!body) {
      return null;
    }
    const parsed: unknown = JSON.parse(body);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("keys" in parsed) ||
      !Array.isArray(parsed.keys)
    ) {
      return null;
    }
    return parsed.keys.filter((key): key is string => typeof key === "string");
  } catch (error) {
    console.error(`Failed to read manifest ${key}`, error);
    return null;
  }
}

async function deleteKeys(keys: string[]): Promise<void> {
  // DeleteObjects takes at most 1000 keys per call.
  for (let index = 0; index < keys.length; index += 1000) {
    const batch = keys.slice(index, index + 1000);
    const response = await s3.send(
      new DeleteObjectsCommand({
        Bucket: BUCKET,
        Delete: { Objects: batch.map((Key) => ({ Key })), Quiet: true },
      }),
    );
    for (const error of response.Errors ?? []) {
      console.error(`Failed to delete ${error.Key}: ${error.Message}`);
    }
  }
}

export async function handler(): Promise<void> {
  const now = Date.now();
  const retentionCutoff = now - RETENTION_DAYS * DAY_MS;
  const minAgeCutoff = now - MIN_AGE_DAYS * DAY_MS;

  const manifests = await listObjects(MANIFEST_PREFIX);
  const freshManifests = manifests.filter(
    (object) => (object.LastModified?.getTime() ?? 0) >= retentionCutoff,
  );

  // An empty keep-set would mean "delete everything". Far more likely than a
  // genuinely idle month is that listing failed, the prefix moved, or the
  // deploy stopped writing manifests — none of which should empty the bucket.
  if (freshManifests.length === 0) {
    console.warn(
      `No manifest newer than ${RETENTION_DAYS} days under ${MANIFEST_PREFIX}; refusing to purge.`,
    );
    return;
  }

  const keep = new Set<string>();
  for (const manifest of freshManifests) {
    if (!manifest.Key) {
      continue;
    }
    const keys = await readManifestKeys(manifest.Key);
    if (keys === null) {
      console.error(
        `Manifest ${manifest.Key} is unreadable; refusing to purge on an incomplete keep-set.`,
      );
      return;
    }
    for (const key of keys) {
      keep.add(key);
    }
  }

  const assets = await listObjects(ASSET_PREFIX);
  const expired = assets.filter((object) => {
    if (!object.Key || keep.has(object.Key)) {
      return false;
    }
    return (object.LastModified?.getTime() ?? now) < minAgeCutoff;
  });

  console.log(
    `${assets.length} assets, ${keep.size} referenced by ${freshManifests.length} manifests within ${RETENTION_DAYS} days, ${expired.length} to delete.`,
  );

  if (expired.length > 0) {
    await deleteKeys(expired.map((object) => object.Key).filter(isString));
  }

  // Manifests outside the window no longer contribute to the keep-set, and
  // dropping them keeps the listing above from growing without bound. Done last
  // so a failure here can never shrink the keep-set used above.
  const staleManifests = manifests
    .filter((object) => (object.LastModified?.getTime() ?? 0) < retentionCutoff)
    .map((object) => object.Key)
    .filter(isString);

  if (staleManifests.length > 0) {
    await deleteKeys(staleManifests);
  }
}

function isString(value: string | undefined): value is string {
  return value !== undefined;
}
