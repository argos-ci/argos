import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GetObjectCommand } from "@aws-sdk/client-s3";

export async function getSignedGetObjectUrl({ s3, Bucket, Key, expiresIn }) {
  const command = new GetObjectCommand({ Bucket, Key });
  return getSignedUrl(s3, command, { expiresIn });
}
