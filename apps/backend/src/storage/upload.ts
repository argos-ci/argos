import { randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { invariant } from "@argos/util/invariant";
import type { PutObjectCommandInput, S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import mime from "mime";

/**
 * Upload a file to S3 from a file path.
 */
export async function uploadFromFilePath({
  s3,
  inputPath,
  Key: KeyArg,
  ...other
}: {
  s3: S3Client;
  inputPath: string;
  Key?: string;
} & Omit<PutObjectCommandInput, "Key">) {
  const Key = KeyArg || randomUUID();
  const ContentType = mime.getType(inputPath);
  invariant(ContentType, `could not determine mime type for ${inputPath}`);
  const upload = new Upload({
    client: s3,
    params: {
      Body: createReadStream(inputPath),
      ContentType,
      Key,
      ...other,
    },
  });
  await upload.done();
  return { Key };
}

/**
 * Upload a file to S3 from a buffer.
 */
export async function uploadFromBuffer({
  s3,
  buffer,
  contentType,
  Key: KeyArg,
  ...other
}: {
  s3: S3Client;
  buffer: Buffer;
  contentType: string;
  Key?: string;
} & Omit<PutObjectCommandInput, "Key">) {
  const Key = KeyArg || randomUUID();
  const upload = new Upload({
    client: s3,
    params: {
      Body: buffer,
      ContentType: contentType,
      Key,
      ...other,
    },
  });
  await upload.done();
  return { Key };
}
