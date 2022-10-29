import { S3Client } from "@aws-sdk/client-s3";
import axios from "axios";
import fs from "fs/promises";
import path from "path";

import config from "@argos-ci/config";

import { getSignedPutObjectUrl } from "./signed-url";

describe("#getSignedPutObjectUrl", () => {
  let s3;

  beforeEach(() => {
    s3 = new S3Client({ region: "eu-west-1" });
  });

  it("generate a signed URL used to upload", async () => {
    const url = await getSignedPutObjectUrl({
      s3,
      Bucket: config.get("s3.screenshotsBucket"),
      Key: "test2.png",
      ChecksumSHA256: "test",
    });

    const inputPath = path.join(
      __dirname,
      "__fixtures__",
      "screenshot_test.jpg"
    );

    const file = await fs.readFile(inputPath);

    const axiosResponse = await axios({
      method: "PUT",
      url,
      data: file,
      headers: {
        "Content-Type": "image/png",
      },
    });

    expect(axiosResponse.status).toBe(200);
  });
});
