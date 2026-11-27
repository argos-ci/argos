import { randomUUID } from "node:crypto";
import { invariant } from "@argos/util/invariant";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  NoSuchKey,
} from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import mime from "mime";

import config from "@/config";
import logger from "@/logger";
import { boom } from "@/util/error";

import { getS3Client } from "./s3";
import { getSignedObjectUrl } from "./signed-url";
import { uploadFromBuffer } from "./upload";

/**
 * Public files: what the app serves to anyone holding the URL (team avatars),
 * and the files people upload from the browser to make them.
 *
 * The browser sends a file to `uploads/` with a presigned POST from
 * {@link createUpload}. The feature it is for reads it back with
 * {@link consumeUpload}, and stores what it serves under `public/` with
 * {@link storePublicFile}. The CDN serves `public/` only: what people download
 * is always a file the app wrote, never the bytes someone sent.
 */

/** Largest file the browser may upload, enforced by S3 through the policy. */
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const UPLOAD_EXPIRES_IN_SECONDS = 600;

/** Set by the infra stack, which must live in us-east-1 for its certificate. */
export const PUBLIC_FILES_REGION = "us-east-1";

/** The only prefix the CDN serves, at its root. */
const PUBLIC_PREFIX = "public/";

const UUID_PATTERN =
  "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

function getPublicFilesS3Client() {
  return getS3Client(PUBLIC_FILES_REGION);
}

function getUploadKeyPrefix(userId: string) {
  return `uploads/${userId}/`;
}

/**
 * Where the browser sends a file, as the given user.
 */
export async function createUpload(args: { userId: string }) {
  const key = `${getUploadKeyPrefix(args.userId)}${randomUUID()}`;
  const { url, fields } = await createPresignedPost(getPublicFilesS3Client(), {
    Bucket: config.get("publicFiles.bucketName"),
    Key: key,
    Expires: UPLOAD_EXPIRES_IN_SECONDS,
    Conditions: [["content-length-range", 1, MAX_UPLOAD_BYTES]],
  });
  return { key, url, fields, maxBytes: MAX_UPLOAD_BYTES };
}

/**
 * Read a file the user uploaded with {@link createUpload}, pass it to
 * `process`, and delete it, whatever `process` does.
 */
export async function consumeUpload<T>(
  args: { userId: string; key: string },
  process: (body: Buffer) => Promise<T>,
): Promise<T> {
  // Only an upload the same user made: nobody acts on a file someone else sent.
  const pattern = new RegExp(
    `^${getUploadKeyPrefix(args.userId)}${UUID_PATTERN}$`,
  );
  if (!pattern.test(args.key)) {
    throw boom(400, "This upload is not yours. Upload the file again.");
  }
  const body = await readUpload(args.key);
  try {
    return await process(body);
  } finally {
    await deletePublicFile(args.key);
  }
}

async function readUpload(key: string): Promise<Buffer> {
  try {
    const response = await getPublicFilesS3Client().send(
      new GetObjectCommand({
        Bucket: config.get("publicFiles.bucketName"),
        Key: key,
      }),
    );
    invariant(response.Body, `Empty body for upload ${key}`);
    return Buffer.from(await response.Body.transformToByteArray());
  } catch (error) {
    if (error instanceof NoSuchKey) {
      throw boom(400, "The file was not uploaded. Upload it again.");
    }
    throw error;
  }
}

/**
 * Store a file anyone can read by URL, and return its key.
 */
export async function storePublicFile(args: {
  /** Groups the files of one feature, e.g. `avatars`. */
  folder: string;
  body: Buffer;
  contentType: string;
}): Promise<string> {
  const extension = mime.getExtension(args.contentType);
  invariant(extension, `No extension for ${args.contentType}`);
  // Random and never rewritten: the CDN caches a file forever, and the
  // feature can delete it as soon as nothing points at it.
  const { Key } = await uploadFromBuffer({
    s3: getPublicFilesS3Client(),
    Bucket: config.get("publicFiles.bucketName"),
    Key: `${PUBLIC_PREFIX}${args.folder}/${randomUUID()}.${extension}`,
    buffer: args.body,
    contentType: args.contentType,
    CacheControl: "public, max-age=31536000, immutable",
  });
  return Key;
}

/**
 * Delete a file stored with {@link storePublicFile}, or an upload.
 */
export async function deletePublicFile(key: string): Promise<void> {
  try {
    await getPublicFilesS3Client().send(
      new DeleteObjectCommand({
        Bucket: config.get("publicFiles.bucketName"),
        Key: key,
      }),
    );
  } catch (error) {
    // Nothing points at the object any more, so a failure only leaves an
    // orphan behind: not worth failing the request that let go of it.
    logger.error({ error, key }, "Failed to delete public files object");
  }
}

/**
 * The URL of a file stored with {@link storePublicFile}.
 */
export async function resolvePublicFileUrl(key: string): Promise<string> {
  const baseUrl = config.get("publicFiles.baseUrl");
  if (baseUrl) {
    return new URL(key.slice(PUBLIC_PREFIX.length), baseUrl).href;
  }
  return getSignedObjectUrl({
    s3: getPublicFilesS3Client(),
    Bucket: config.get("publicFiles.bucketName"),
    Key: key,
    expiresIn: 3600,
    method: "GET",
  });
}
