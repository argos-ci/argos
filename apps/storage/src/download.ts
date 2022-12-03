import { GetObjectCommand } from "@aws-sdk/client-s3";
import type { S3Client } from "@aws-sdk/client-s3";
import { createWriteStream } from "node:fs";
import type { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

export const download = async ({
  s3,
  outputPath,
  ...other
}: {
  s3: S3Client;
  outputPath: string;
} & GetObjectCommand["input"]) => {
  const result = await s3.send(new GetObjectCommand(other));
  if (!result.Body) {
    throw new Error("No body");
  }
  await pipeline(result.Body as Readable, createWriteStream(outputPath));
};
