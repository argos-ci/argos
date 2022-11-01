import { GetObjectCommand } from "@aws-sdk/client-s3";
import type { S3Client } from "@aws-sdk/client-s3";
import { createWriteStream } from "node:fs";
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
  await pipeline(result.Body, createWriteStream(outputPath));
};
