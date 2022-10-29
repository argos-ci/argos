import { PutObjectCommand } from "@aws-sdk/client-s3";
import type { S3Client } from "@aws-sdk/client-s3";
import mime from "mime";
import { randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";

export const upload = async ({
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
    })
  );
  return { Key };
};
