import { createReadStream } from "fs";
import { randomUuid } from "crypto";
import mime from "mime";

export function upload({ s3, inputPath, ...other }) {
  return s3
    .upload({
      Body: createReadStream(inputPath),
      ContentType: mime.getType(inputPath),
      Key: randomUuid(),
      ...other,
    })
    .promise();
}
