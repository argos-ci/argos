import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { rimraf } from "rimraf";
import { beforeAll, describe, expect, it } from "vitest";

import { LocalImageFile } from "@/storage/index.js";

import imageDifference from "../imageDifference.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

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

describe("diff E2E", () => {
  beforeAll(async () => {
    // Clean up actual-files
    await rimraf.sync(join(__dirname, "/actual-files"));
  });

  it("generates different images", async () => {
    const baseFilename = "checkerboard.png";
    const compareFilename = "white.png";

    const { filepath: _diffFilepath, ...difference } = await compareLocalImages(
      {
        baseFilepath: join(__dirname, "/test-files", baseFilename),
        compareFilepath: join(__dirname, "/test-files", compareFilename),
      },
    );

    expect(difference).toMatchSnapshot();
  });

  it("generates the same image", async () => {
    const baseFilename = "checkerboard.png";
    const compareFilename = "checkerboard.png";

    const { filepath: _diffFilepath, ...difference } = await compareLocalImages(
      {
        baseFilepath: join(__dirname, "/test-files", baseFilename),
        compareFilepath: join(__dirname, "/test-files", compareFilename),
      },
    );

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

    const { filepath: _diffFilepath, ...difference } = await compareLocalImages(
      {
        baseFilepath: join(__dirname, "/test-files", baseFilename),
        compareFilepath: join(__dirname, "/test-files", compareFilename),
      },
    );

    expect(difference).toMatchSnapshot();
  });

  it("generates the same image where 1 has a transparent background", async () => {
    const baseFilename = "checkerboard-transparent.png";
    const compareFilename = "checkerboard.png";

    const { filepath: _diffFilepath, ...difference } = await compareLocalImages(
      {
        baseFilepath: join(__dirname, "/test-files", baseFilename),
        compareFilepath: join(__dirname, "/test-files", compareFilename),
      },
    );

    expect(difference).toMatchSnapshot();
  });

  it("generates images with big diff", async () => {
    const baseFilename = "old-site.png";
    const compareFilename = "new-site.png";

    const { filepath: _diffFilepath, ...difference } = await compareLocalImages(
      {
        baseFilepath: join(__dirname, "/test-files", baseFilename),
        compareFilepath: join(__dirname, "/test-files", compareFilename),
      },
    );

    expect(difference).toMatchSnapshot();
  });

  it("works with large size image", async () => {
    const baseFilename = "big-image.png";
    const compareFilename = "big-image2.png";

    const { filepath: _diffFilepath, ...difference } = await compareLocalImages(
      {
        baseFilepath: join(__dirname, "/test-files", baseFilename),
        compareFilepath: join(__dirname, "/test-files", compareFilename),
      },
    );

    expect(difference).toMatchSnapshot();
  });

  it("takes into account colors in comparison", async () => {
    const baseFilename = "violet-square.png";
    const compareFilename = "black-square.png";

    const { filepath: _diffFilepath, ...difference } = await compareLocalImages(
      {
        baseFilepath: join(__dirname, "/test-files", baseFilename),
        compareFilepath: join(__dirname, "/test-files", compareFilename),
      },
    );

    expect(difference).toMatchSnapshot();
  });
});
