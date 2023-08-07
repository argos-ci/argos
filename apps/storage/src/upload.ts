import { PutObjectCommand } from "@aws-sdk/client-s3";
import type { S3Client } from "@aws-sdk/client-s3";
import mime from "mime";
import { randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";

export const uploadFromFilePath = async ({
  s3,
  inputPath,
  Key: KeyArg,
  ...other
}: {
  s3: S3Client;
  inputPath: string;
  Key?: string;
} & Omit<PutObjectCommand["input"], "Key">) => {
  const Key = KeyArg || randomUUID();
  const ContentType = mime.getType(inputPath);
  if (!ContentType) {
    throw new Error(`Could not determine mime type for ${inputPath}`);
  }
  await s3.send(
    new PutObjectCommand({
      Body: createReadStream(inputPath),
      ContentType,
      Key,
      ...other,
    }),
  );
  return { Key };
};

export const uploadFromBuffer = async ({
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
} & Omit<PutObjectCommand["input"], "Key">) => {
  const Key = KeyArg || randomUUID();
  await s3.send(
    new PutObjectCommand({
      Body: buffer,
      ContentType: contentType,
      Key,
      ...other,
    }),
  );
  return { Key };
};
