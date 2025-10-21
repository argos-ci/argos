import { createWriteStream } from "node:fs";
import type { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { invariant } from "@argos/util/invariant";
import type { GetObjectCommandOutput } from "@aws-sdk/client-s3";

/**
 * Download the S3 object to the specified output path.
 */
export async function download(
  result: GetObjectCommandOutput,
  outputPath: string,
) {
  invariant(result.Body, "no body");
  await pipeline(result.Body as Readable, createWriteStream(outputPath));
  return result;
}
