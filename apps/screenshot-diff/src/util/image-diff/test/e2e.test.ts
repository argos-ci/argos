// @ts-ignore
import getPixels from "get-pixels";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
// @ts-ignore
import rimraf from "rimraf";

import { S3Image, s3 as s3client } from "@argos-ci/storage";

import imageDifference from "../imageDifference.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const s3 = s3client();

function getPixelsAsync(filename: string) {
  return new Promise((accept, reject) => {
    getPixels(filename, (err: Error, pixels: number) => {
      if (err) {
        reject(err);
        return;
      }

      accept(pixels);
    });
  });
}

async function compareLocalImages({
  baseFilePath,
  compareFilePath,
  diffFilePath,
}: {
  baseFilePath: string;
  compareFilePath: string;
  diffFilePath: string;
}) {
  return imageDifference({
    baseImage: new S3Image({
      s3,
      filePath: baseFilePath,
      localFile: true,
      protectOriginal: true,
    }),
    compareImage: new S3Image({
      s3,
      filePath: compareFilePath,
      localFile: true,
      protectOriginal: true,
    }),
    diffImage: new S3Image({
      s3,
      filePath: diffFilePath,
      localFile: true,
      protectOriginal: true,
    }),
  });
}

describe("e2e", () => {
  beforeAll(async () => {
    // Clean up actual-files
    await rimraf.sync(join(__dirname, "/actual-files"));
  });

  it("diffing different images", async () => {
    const baseFileName = "checkerboard.png";
    const compareFileName = "white.png";
    const diffFileName = "different.png";

    const diffFilePath = join(__dirname, "/actual-files", diffFileName);
    const difference = await compareLocalImages({
      baseFilePath: join(__dirname, "/test-files", baseFileName),
      compareFilePath: join(__dirname, "/test-files", compareFileName),
      diffFilePath,
    });

    const actual = await getPixelsAsync(diffFilePath);
    const expected = await getPixelsAsync(
      join(__dirname, "/expected-files", diffFileName)
    );

    expect(difference).toMatchSnapshot();
    expect(actual).toEqual(expected);
  });

  it("diffing the same image", async () => {
    const baseFileName = "checkerboard.png";
    const compareFileName = "checkerboard.png";
    const diffFileName = "same.png";

    const diffFilePath = join(__dirname, "/actual-files", diffFileName);
    const difference = await compareLocalImages({
      baseFilePath: join(__dirname, "/test-files", baseFileName),
      compareFilePath: join(__dirname, "/test-files", compareFileName),
      diffFilePath,
    });

    const actual = await getPixelsAsync(diffFilePath);
    const expected = await getPixelsAsync(
      join(__dirname, "/expected-files", diffFileName)
    );

    expect(difference).toMatchSnapshot();
    expect(actual).toEqual(expected);

    expect(difference).toEqual({
      value: 0,
      width: 10,
      height: 10,
    });
    expect(actual).toEqual(expected);
  });

  it("diffing different sizes images", async () => {
    const baseFileName = "checkerboard-excess.png";
    const compareFileName = "checkerboard.png";
    const diffFileName = "different-size.png";

    const diffFilePath = join(__dirname, "/actual-files", diffFileName);
    const difference = await compareLocalImages({
      baseFilePath: join(__dirname, "/test-files", baseFileName),
      compareFilePath: join(__dirname, "/test-files", compareFileName),
      diffFilePath,
    });

    const actual = await getPixelsAsync(diffFilePath);
    const expected = await getPixelsAsync(
      join(__dirname, "/expected-files", diffFileName)
    );

    expect(difference).toMatchSnapshot();
    expect(actual).toEqual(expected);
  });

  it("diffing the same image where 1 has a transparent background", async () => {
    const baseFileName = "checkerboard-transparent.png";
    const compareFileName = "checkerboard.png";
    const diffFileName = "different-transparent.png";

    const difference = await compareLocalImages({
      baseFilePath: join(__dirname, "/test-files", baseFileName),
      compareFilePath: join(__dirname, "/test-files", compareFileName),
      diffFilePath: join(__dirname, "/actual-files", diffFileName),
    });

    expect(difference).toMatchSnapshot();
  });

  it("diffing images with big diff", async () => {
    const baseFileName = "old-site.png";
    const compareFileName = "new-site.png";
    const diffFileName = "diff-site.png";

    const difference = await compareLocalImages({
      baseFilePath: join(__dirname, "/test-files", baseFileName),
      compareFilePath: join(__dirname, "/test-files", compareFileName),
      diffFilePath: join(__dirname, "/actual-files", diffFileName),
    });

    expect(difference).toMatchSnapshot();
  });
});
