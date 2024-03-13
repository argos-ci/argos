import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { S3Client } from "@aws-sdk/client-s3";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import config from "@/config/index.js";

import { get } from "./get.js";
import { uploadFromFilePath } from "./upload.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

describe("#get", () => {
  const s3 = new S3Client({ region: "eu-west-1" });

  afterAll(() => {
    s3.destroy();
  });

  beforeAll(async () => {
    await uploadFromFilePath({
      s3,
      Bucket: config.get("s3.screenshotsBucket"),
      Key: "hello.txt",
      inputPath: join(__dirname, "__fixtures__", "hello.txt"),
    });
  });

  it("gets a file from S3", async () => {
    const result = await get({
      s3,
      Bucket: config.get("s3.screenshotsBucket"),
      Key: "hello.txt",
    });

    expect(result.ContentType).toBe("text/plain");
  });
});
