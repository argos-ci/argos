import { assertNever } from "@argos/util/assertNever";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import type { S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Get a signed URL for S3.
 *
 * On GET, `responseContentType` and `responseContentDisposition` override the
 * headers S3 returns when the object is fetched (via the `response-content-*`
 * presigned query parameters). This is used to serve non-image files as
 * neutralized downloads regardless of the content type stored on the object.
 */
export async function getSignedObjectUrl(args: {
  s3: S3Client;
  Bucket: string;
  Key: string;
  expiresIn: number;
  method: "GET" | "PUT";
  responseContentType?: string;
  responseContentDisposition?: string;
}) {
  const { s3, Bucket, Key, expiresIn } = args;
  const command = (() => {
    switch (args.method) {
      case "GET":
        return new GetObjectCommand({
          Bucket,
          Key,
          ResponseContentType: args.responseContentType,
          ResponseContentDisposition: args.responseContentDisposition,
        });
      case "PUT":
        return new PutObjectCommand({ Bucket, Key });
      default:
        assertNever(args.method);
    }
  })();
  return getSignedUrl(s3, command, { expiresIn });
}
