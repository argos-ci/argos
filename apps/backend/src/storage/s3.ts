import { S3Client } from "@aws-sdk/client-s3";
import { memoize } from "lodash-es";

export type { S3Client } from "@aws-sdk/client-s3";

type S3Region = "eu-west-1" | "us-east-1";

function getS3ClientBase(region: S3Region = "eu-west-1") {
  return new S3Client({ region });
}

/**
 * Get the S3 client instance.
 */
export const getS3Client: typeof getS3ClientBase = memoize(getS3ClientBase);
