import { createReadStream } from "fs";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import mime from "mime";

export async function upload({ s3, inputPath, Key: KeyArg, ...other }) {
  const Key = KeyArg || randomUUID();
  await s3.send(
    new PutObjectCommand({
      Body: createReadStream(inputPath),
      ContentType: mime.getType(inputPath),
      Key,
      ...other,
    })
  );
  return { Key };
}
