import { S3Client } from "@aws-sdk/client-s3";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import config from "@argos-ci/config";

import { get } from "./get.js";
import { upload } from "./upload.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

describe("#get", () => {
  const s3 = new S3Client({ region: "eu-west-1" });

  afterAll(() => {
    s3.destroy();
  });

  beforeAll(() => {
    return upload({
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
