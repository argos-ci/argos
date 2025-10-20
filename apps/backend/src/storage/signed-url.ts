import { assertNever } from "@argos/util/assertNever";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import type { S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Get a signed URL for S3.
 */
export async function getSignedObjectUrl(args: {
  s3: S3Client;
  Bucket: string;
  Key: string;
  expiresIn: number;
  method: "GET" | "PUT";
}) {
  const { s3, Bucket, Key, expiresIn } = args;
  const command = (() => {
    switch (args.method) {
      case "GET":
        return new GetObjectCommand({ Bucket, Key });
      case "PUT":
        return new PutObjectCommand({ Bucket, Key });
      default:
        assertNever(args.method);
    }
  })();
  return getSignedUrl(s3, command, { expiresIn });
}
