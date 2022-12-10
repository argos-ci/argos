import type { GetObjectCommandOutput } from "@aws-sdk/client-s3";
import { createWriteStream } from "node:fs";
import type { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

export const download = async (
  result: GetObjectCommandOutput,
  outputPath: string
) => {
  if (!result.Body) {
    throw new Error("No body");
  }
  await pipeline(result.Body as Readable, createWriteStream(outputPath));
  return result;
};
