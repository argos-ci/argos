import { S3Client } from "@aws-sdk/client-s3";
import path from "path";

import config from "@argos-ci/config";

import { upload } from "./upload";

describe("#upload", () => {
  let s3;

  beforeEach(() => {
    s3 = new S3Client({ region: "eu-west-1" });
  });

  it("should upload a file to S3", async () => {
    const inputPath = path.join(
      __dirname,
      "__fixtures__",
      "screenshot_test.jpg"
    );
    const data = await upload({
      s3,
      inputPath,
      Bucket: config.get("s3.screenshotsBucket"),
    });

    expect(data.Key).not.toBe(undefined);
  });
});
