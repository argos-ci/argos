import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { rimraf } from "rimraf";
import { beforeAll, describe, expect, it } from "vitest";

import { LocalImageFile } from "@/storage/index.js";

import { diffImages } from "../index.js";
import { invariant } from "@/util/invariant.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

async function compareLocalImages(params: {
  baseFilepath: string;
  compareFilepath: string;
}) {
  return diffImages(
    new LocalImageFile({
      filepath: params.baseFilepath,
    }),
    new LocalImageFile({
      filepath: params.compareFilepath,
    }),
  );
}

describe("diff E2E", () => {
  beforeAll(async () => {
    // Clean up actual-files
    await rimraf.sync(join(__dirname, "/actual-files"));
  });

  it("generates different images", async () => {
    const baseFilename = "checkerboard.png";
    const compareFilename = "white.png";

    const result = await compareLocalImages({
      baseFilepath: join(__dirname, "/test-files", baseFilename),
      compareFilepath: join(__dirname, "/test-files", compareFilename),
    });

    invariant(result, "result should be defined");
    const { filepath: _diffFilepath, ...scoreAndDimensions } = result;

    expect(scoreAndDimensions).toMatchSnapshot();
  });

  it("generates the same image", async () => {
    const baseFilename = "checkerboard.png";
    const compareFilename = "checkerboard.png";

    const result = await compareLocalImages({
      baseFilepath: join(__dirname, "/test-files", baseFilename),
      compareFilepath: join(__dirname, "/test-files", compareFilename),
    });

    expect(result).toBe(null);
  });

  it("generates different sizes images", async () => {
    const baseFilename = "checkerboard-excess.png";
    const compareFilename = "checkerboard.png";

    const result = await compareLocalImages({
      baseFilepath: join(__dirname, "/test-files", baseFilename),
      compareFilepath: join(__dirname, "/test-files", compareFilename),
    });

    invariant(result, "result should be defined");
    const { filepath: _diffFilepath, ...scoreAndDimensions } = result;

    expect(scoreAndDimensions).toMatchSnapshot();
  });

  it("generates the same image where 1 has a transparent background", async () => {
    const baseFilename = "checkerboard-transparent.png";
    const compareFilename = "checkerboard.png";

    const result = await compareLocalImages({
      baseFilepath: join(__dirname, "/test-files", baseFilename),
      compareFilepath: join(__dirname, "/test-files", compareFilename),
    });

    expect(result).toBe(null);
  });

  it("generates images with big diff", async () => {
    const baseFilename = "old-site.png";
    const compareFilename = "new-site.png";

    const result = await compareLocalImages({
      baseFilepath: join(__dirname, "/test-files", baseFilename),
      compareFilepath: join(__dirname, "/test-files", compareFilename),
    });

    invariant(result, "result should be defined");
    const { filepath: _diffFilepath, ...scoreAndDimensions } = result;

    expect(scoreAndDimensions).toMatchSnapshot();
  });

  it("works with large size image", async () => {
    const baseFilename = "big-image.png";
    const compareFilename = "big-image2.png";

    const result = await compareLocalImages({
      baseFilepath: join(__dirname, "/test-files", baseFilename),
      compareFilepath: join(__dirname, "/test-files", compareFilename),
    });

    invariant(result, "result should be defined");
    const { filepath: _diffFilepath, ...scoreAndDimensions } = result;

    expect(scoreAndDimensions).toMatchSnapshot();
  }, 10000);

  it("takes into account colors in comparison", async () => {
    const baseFilename = "violet-square.png";
    const compareFilename = "black-square.png";

    const result = await compareLocalImages({
      baseFilepath: join(__dirname, "/test-files", baseFilename),
      compareFilepath: join(__dirname, "/test-files", compareFilename),
    });

    invariant(result, "result should be defined");
    const { filepath: _diffFilepath, ...scoreAndDimensions } = result;

    expect(scoreAndDimensions).toMatchSnapshot();
  });
});
