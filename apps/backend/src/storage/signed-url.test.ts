import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { S3Client } from "@aws-sdk/client-s3";
import axios from "axios";
import { beforeEach, describe, expect, it } from "vitest";

import config from "@/config/index.js";

import { getSignedObjectUrl } from "./signed-url.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

describe("#getSignedObjectUrl", () => {
  let s3: S3Client;

  beforeEach(() => {
    s3 = new S3Client({ region: "eu-west-1" });
  });

  it("generate a signed URL used to upload", async () => {
    const url = await getSignedObjectUrl({
      s3,
      Bucket: config.get("s3.screenshotsBucket"),
      Key: "test2.png",
      expiresIn: 60,
      method: "PUT",
    });

    const inputPath = join(__dirname, "__fixtures__", "screenshot_test.jpg");

    const file = await readFile(inputPath);

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
