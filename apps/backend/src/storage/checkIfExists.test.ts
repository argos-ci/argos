import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { S3Client } from "@aws-sdk/client-s3";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import config from "@/config/index.js";

import { checkIfExists } from "./checkIfExists.js";
import { uploadFromFilePath } from "./upload.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

describe("#download", () => {
  let s3: S3Client;

  beforeAll(async () => {
    s3 = new S3Client({ region: "eu-west-1" });
    await uploadFromFilePath({
      s3,
      Bucket: config.get("s3.screenshotsBucket"),
      Key: "hello.txt",
      inputPath: join(__dirname, "__fixtures__", "hello.txt"),
    });
  });

  afterAll(() => {
    s3.destroy();
  });

  it("returns `true` if it exists", async () => {
    const result = await checkIfExists({
      s3,
      Bucket: config.get("s3.screenshotsBucket"),
      Key: "hello.txt",
    });
    expect(result).toBe(true);
  });

  it("returns `false` if it does not exist", async () => {
    const result = await checkIfExists({
      s3,
      Bucket: config.get("s3.screenshotsBucket"),
      Key: "hello-nop.txt",
    });
    expect(result).toBe(false);
  });
});
