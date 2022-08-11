import path from "path";
import { S3Client } from "@aws-sdk/client-s3";
import config from "@argos-ci/config";
import { upload } from "./upload";
import { checkIfExists } from "./checkIfExists";

describe("#download", () => {
  const s3 = new S3Client({ region: "eu-west-1" });

  beforeAll(async () => {
    await upload({
      s3,
      Bucket: config.get("s3.screenshotsBucket"),
      Key: "hello.txt",
      inputPath: path.join(__dirname, "__fixtures__", "hello.txt"),
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
