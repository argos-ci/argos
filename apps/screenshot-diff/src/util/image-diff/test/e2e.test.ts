/* eslint-disable @typescript-eslint/no-unused-vars */
// @ts-ignore
import getPixels from "get-pixels";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
// @ts-ignore
import rimraf from "rimraf";

import { LocalImageFile } from "@argos-ci/storage";

import imageDifference from "../imageDifference.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

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

async function compareLocalImages(params: {
  baseFilepath: string;
  compareFilepath: string;
}) {
  return imageDifference({
    baseImage: new LocalImageFile({
      filepath: params.baseFilepath,
    }),
    compareImage: new LocalImageFile({
      filepath: params.compareFilepath,
    }),
  });
}

describe("e2e", () => {
  beforeAll(async () => {
    // Clean up actual-files
    await rimraf.sync(join(__dirname, "/actual-files"));
  });

  it("diffing different images", async () => {
    const baseFilename = "checkerboard.png";
    const compareFilename = "white.png";
    const diffFileName = "different.png";

    const { filepath: diffFilepath, ...difference } = await compareLocalImages({
      baseFilepath: join(__dirname, "/test-files", baseFilename),
      compareFilepath: join(__dirname, "/test-files", compareFilename),
    });

    const actual = await getPixelsAsync(diffFilepath);
    const expected = await getPixelsAsync(
      join(__dirname, "/expected-files", diffFileName)
    );

    expect(difference).toMatchSnapshot();
    expect(actual).toEqual(expected);
  });

  it("diffing the same image", async () => {
    const baseFilename = "checkerboard.png";
    const compareFilename = "checkerboard.png";
    const diffFileName = "same.png";

    const { filepath: diffFilepath, ...difference } = await compareLocalImages({
      baseFilepath: join(__dirname, "/test-files", baseFilename),
      compareFilepath: join(__dirname, "/test-files", compareFilename),
    });

    const actual = await getPixelsAsync(diffFilepath);
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
    const baseFilename = "checkerboard-excess.png";
    const compareFilename = "checkerboard.png";
    const diffFileName = "different-size.png";

    const { filepath: diffFilepath, ...difference } = await compareLocalImages({
      baseFilepath: join(__dirname, "/test-files", baseFilename),
      compareFilepath: join(__dirname, "/test-files", compareFilename),
    });

    const actual = await getPixelsAsync(diffFilepath);
    const expected = await getPixelsAsync(
      join(__dirname, "/expected-files", diffFileName)
    );

    expect(difference).toMatchSnapshot();
    expect(actual).toEqual(expected);
  });

  it("diffing the same image where 1 has a transparent background", async () => {
    const baseFilename = "checkerboard-transparent.png";
    const compareFilename = "checkerboard.png";

    const { filepath: diffFilepath, ...difference } = await compareLocalImages({
      baseFilepath: join(__dirname, "/test-files", baseFilename),
      compareFilepath: join(__dirname, "/test-files", compareFilename),
    });

    expect(difference).toMatchSnapshot();
  });

  it("diffing images with big diff", async () => {
    const baseFilename = "old-site.png";
    const compareFilename = "new-site.png";

    const { filepath: diffFilepath, ...difference } = await compareLocalImages({
      baseFilepath: join(__dirname, "/test-files", baseFilename),
      compareFilepath: join(__dirname, "/test-files", compareFilename),
    });

    expect(difference).toMatchSnapshot();
  });
});
