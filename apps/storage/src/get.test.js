import { S3Client } from "@aws-sdk/client-s3";
import path from "path";

import config from "@argos-ci/config";

import { get } from "./get";
import { upload } from "./upload";

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
      inputPath: path.join(__dirname, "__fixtures__", "hello.txt"),
    });
  });

  it("gets a file from S3", async () => {
    const result = await get({
      s3,
      Bucket: config.get("s3.screenshotsBucket"),
      Key: "hello.txt",
    });

    expect(result.Body.statusCode).toBe(200);
  });
});
