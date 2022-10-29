import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export async function getSignedGetObjectUrl({ s3, Bucket, Key, expiresIn }) {
  const command = new GetObjectCommand({ Bucket, Key });
  return getSignedUrl(s3, command, { expiresIn });
}

export async function getSignedPutObjectUrl({ s3, Bucket, Key, expiresIn }) {
  const command = new PutObjectCommand({ Bucket, Key });
  return getSignedUrl(s3, command, { expiresIn });
}
