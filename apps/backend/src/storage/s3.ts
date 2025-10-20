import { S3Client } from "@aws-sdk/client-s3";

export type { S3Client } from "@aws-sdk/client-s3";

let client: S3Client;

/**
 * Get the S3 client instance.
 */
export function getS3Client() {
  if (!client) {
    client = new S3Client({ region: "eu-west-1" });
  }
  return client;
}
