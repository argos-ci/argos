import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { rimraf } from "rimraf";
import { beforeAll, describe, expect, it } from "vitest";

import { ImageHandle, LocalFileHandle } from "@/storage";

import { diffImages } from "..";
import type { DiffResult } from "../../types";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

async function compareLocalImages(params: {
  baseFilepath: string;
  compareFilepath: string;
}) {
  return diffImages(
    new ImageHandle({
      fileHandle: new LocalFileHandle({
        filepath: params.baseFilepath,
      }),
    }),
    new ImageHandle({
      fileHandle: new LocalFileHandle({
        filepath: params.compareFilepath,
      }),
    }),
    { threshold: 0.5 },
  );
}

function snapshotResult(result: DiffResult) {
  return {
    score: result.score,
    width: result.file?.width,
    height: result.file?.height,
    contentType: result.file?.contentType,
  };
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

    expect(snapshotResult(result)).toMatchSnapshot();
  });

  it("generates the same image", async () => {
    const baseFilename = "checkerboard.png";
    const compareFilename = "checkerboard.png";

    const result = await compareLocalImages({
      baseFilepath: join(__dirname, "/test-files", baseFilename),
      compareFilepath: join(__dirname, "/test-files", compareFilename),
    });

    expect(result.score).toBe(0);
  });

  it("generates different sizes images", async () => {
    const baseFilename = "checkerboard-excess.png";
    const compareFilename = "checkerboard.png";

    const result = await compareLocalImages({
      baseFilepath: join(__dirname, "/test-files", baseFilename),
      compareFilepath: join(__dirname, "/test-files", compareFilename),
    });

    expect(snapshotResult(result)).toMatchSnapshot();
  });

  it("generates the same image where 1 has a transparent background", async () => {
    const baseFilename = "checkerboard-transparent.png";
    const compareFilename = "checkerboard.png";

    const result = await compareLocalImages({
      baseFilepath: join(__dirname, "/test-files", baseFilename),
      compareFilepath: join(__dirname, "/test-files", compareFilename),
    });

    expect(snapshotResult(result)).toMatchSnapshot();
  });

  it("generates images with big diff", async () => {
    const baseFilename = "old-site.png";
    const compareFilename = "new-site.png";

    const result = await compareLocalImages({
      baseFilepath: join(__dirname, "/test-files", baseFilename),
      compareFilepath: join(__dirname, "/test-files", compareFilename),
    });

    expect(snapshotResult(result)).toMatchSnapshot();
  });

  it("works with large size image", async () => {
    const baseFilename = "big-image.png";
    const compareFilename = "big-image2.png";

    const result = await compareLocalImages({
      baseFilepath: join(__dirname, "/test-files", baseFilename),
      compareFilepath: join(__dirname, "/test-files", compareFilename),
    });

    expect(snapshotResult(result)).toMatchSnapshot();
  }, 10000);

  it("takes into account colors in comparison", async () => {
    const baseFilename = "violet-square.png";
    const compareFilename = "black-square.png";

    const result = await compareLocalImages({
      baseFilepath: join(__dirname, "/test-files", baseFilename),
      compareFilepath: join(__dirname, "/test-files", compareFilename),
    });

    expect(snapshotResult(result)).toMatchSnapshot();
  });
});
