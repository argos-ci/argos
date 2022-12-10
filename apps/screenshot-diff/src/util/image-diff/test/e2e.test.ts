/* eslint-disable @typescript-eslint/no-unused-vars */
// @ts-ignore
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
// @ts-ignore
import rimraf from "rimraf";

import { LocalImageFile } from "@argos-ci/storage";

import imageDifference from "../imageDifference.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export const hashFile = async (filepath: string) => {
  const fileStream = createReadStream(filepath);
  const hash = createHash("sha256");
  await new Promise((resolve, reject) => {
    fileStream.on("error", reject);
    hash.on("error", reject);
    hash.on("finish", resolve);
    fileStream.pipe(hash);
  });
  return hash.read().toString("hex");
};

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

  it("generates different images", async () => {
    const baseFilename = "checkerboard.png";
    const compareFilename = "white.png";

    const { filepath: diffFilepath, ...difference } = await compareLocalImages({
      baseFilepath: join(__dirname, "/test-files", baseFilename),
      compareFilepath: join(__dirname, "/test-files", compareFilename),
    });

    expect(difference).toMatchSnapshot();
  });

  it("generates the same image", async () => {
    const baseFilename = "checkerboard.png";
    const compareFilename = "checkerboard.png";

    const { filepath: diffFilepath, ...difference } = await compareLocalImages({
      baseFilepath: join(__dirname, "/test-files", baseFilename),
      compareFilepath: join(__dirname, "/test-files", compareFilename),
    });

    expect(difference).toMatchSnapshot();

    expect(difference).toEqual({
      value: 0,
      width: 10,
      height: 10,
    });
  });

  it("generates different sizes images", async () => {
    const baseFilename = "checkerboard-excess.png";
    const compareFilename = "checkerboard.png";

    const { filepath: diffFilepath, ...difference } = await compareLocalImages({
      baseFilepath: join(__dirname, "/test-files", baseFilename),
      compareFilepath: join(__dirname, "/test-files", compareFilename),
    });

    expect(difference).toMatchSnapshot();
  });

  it("generates the same image where 1 has a transparent background", async () => {
    const baseFilename = "checkerboard-transparent.png";
    const compareFilename = "checkerboard.png";

    const { filepath: diffFilepath, ...difference } = await compareLocalImages({
      baseFilepath: join(__dirname, "/test-files", baseFilename),
      compareFilepath: join(__dirname, "/test-files", compareFilename),
    });

    expect(difference).toMatchSnapshot();
  });

  it("generates images with big diff", async () => {
    const baseFilename = "old-site.png";
    const compareFilename = "new-site.png";

    const { filepath: diffFilepath, ...difference } = await compareLocalImages({
      baseFilepath: join(__dirname, "/test-files", baseFilename),
      compareFilepath: join(__dirname, "/test-files", compareFilename),
    });

    expect(difference).toMatchSnapshot();
  });

  it("works with large size image", async () => {
    const baseFilename = "big-image.png";
    const compareFilename = "big-image2.png";

    const { filepath: diffFilepath, ...difference } = await compareLocalImages({
      baseFilepath: join(__dirname, "/test-files", baseFilename),
      compareFilepath: join(__dirname, "/test-files", compareFilename),
    });

    expect(difference).toMatchSnapshot();
  });

  it("generates images similar colors", async () => {
    const baseFilename = "violet-square.png";
    const compareFilename = "black-square.png";

    const { filepath: diffFilepath, ...difference } = await compareLocalImages({
      baseFilepath: join(__dirname, "/test-files", baseFilename),
      compareFilepath: join(__dirname, "/test-files", compareFilename),
    });

    expect(difference).toMatchSnapshot();
  });
});
