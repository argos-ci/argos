import { S3Client } from "@aws-sdk/client-s3";
import { readFile } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import tmp from "tmp";

import config from "@argos-ci/config";

import { download } from "./download.js";
import { upload } from "./upload.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const readFileAsync = promisify(readFile);

describe("#download", () => {
  const s3 = new S3Client({ region: "eu-west-1" });
  let tmpDirectory: string;

  beforeAll(() => {
    return upload({
      s3,
      Bucket: config.get("s3.screenshotsBucket"),
      Key: "hello.txt",
      inputPath: join(__dirname, "__fixtures__", "hello.txt"),
    });
  });

  beforeEach(() => {
    tmpDirectory = tmp.dirSync().name;
  });

  it("should download a file from S3", async () => {
    const outputPath = join(tmpDirectory, "hello.txt");
    await download({
      s3,
      outputPath,
      Bucket: config.get("s3.screenshotsBucket"),
      Key: "hello.txt",
    });

    const file = await readFileAsync(outputPath, "utf-8");
    expect(file).toEqual("hello!\n");
  });

  it("should correctly handle errors", async () => {
    const outputPath = join(tmpDirectory, "hello.txt");
    let error;

    try {
      await download({
        s3,
        outputPath,
        Bucket: config.get("s3.screenshotsBucket"),
        Key: "hello-nop.txt",
      });
    } catch (e) {
      error = e;
    }

    expect(error).not.toBe(undefined);
  });
});
