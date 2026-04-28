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
