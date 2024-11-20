import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import type { S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const getSignedGetObjectUrl = async ({
  s3,
  Bucket,
  Key,
  expiresIn,
}: {
  s3: S3Client;
  Bucket: string;
  Key: string;
  expiresIn: number;
}) => {
  const command = new GetObjectCommand({ Bucket, Key });
  return getSignedUrl(s3, command, { expiresIn });
};

export const getSignedPutObjectUrl = async ({
  s3,
  Bucket,
  Key,
  expiresIn,
}: {
  s3: S3Client;
  Bucket: string;
  Key: string;
  expiresIn: number;
}) => {
  const command = new PutObjectCommand({ Bucket, Key });
  return getSignedUrl(s3, command, { expiresIn });
};
