import { createWriteStream } from "fs";
import { GetObjectCommand } from "@aws-sdk/client-s3";

export async function download({ s3, outputPath, ...other }) {
  const result = await s3.send(new GetObjectCommand(other));

  return new Promise((resolve, reject) => {
    const writeStream = createWriteStream(outputPath);
    writeStream.on("finish", resolve);
    writeStream.on("error", reject);
    result.Body.on("error", reject);
    result.Body.pipe(writeStream);
  });
}
