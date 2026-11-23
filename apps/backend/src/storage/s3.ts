import { S3Client } from "@aws-sdk/client-s3";
import { memoize } from "lodash-es";

import config from "@/config";

export type { S3Client } from "@aws-sdk/client-s3";

function getS3ClientBase(region: string = config.get("s3.region")) {
  return new S3Client({ region });
}

/**
 * Get the S3 client instance.
 */
export const getS3Client: typeof getS3ClientBase = memoize(getS3ClientBase);

/**
 * Whether S3 answered that the object is missing.
 */
export function checkIsS3NotFoundError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  if ("name" in error && error.name === "NotFound") {
    return true;
  }
  // A bucket without `s3:ListBucket` answers 403 for a missing key rather than
  // 404 — indistinguishable from absent, and treated as such.
  return (
    "$metadata" in error &&
    typeof error.$metadata === "object" &&
    error.$metadata !== null &&
    "httpStatusCode" in error.$metadata &&
    (error.$metadata.httpStatusCode === 404 ||
      error.$metadata.httpStatusCode === 403)
  );
}
