import { GetObjectCommand } from "@aws-sdk/client-s3";
import type { S3Client } from "@aws-sdk/client-s3";

export type GetParams = { s3: S3Client } & GetObjectCommand["input"];

/**
 * Get an object from S3.
 */
export async function get({ s3, ...other }: GetParams) {
  return s3.send(new GetObjectCommand(other));
}
