import { createReadStream } from "fs";
import { randomUUID } from "crypto";
import mime from "mime";

export function upload({ s3, inputPath, ...other }) {
  return s3
    .upload({
      Body: createReadStream(inputPath),
      ContentType: mime.getType(inputPath),
      Key: randomUUID(),
      ...other,
    })
    .promise();
}
