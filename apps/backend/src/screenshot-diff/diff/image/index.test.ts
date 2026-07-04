import { copyFile, unlink } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { describe, expect, test } from "vitest";

import { LocalFileHandle } from "@/storage/FileHandle";
import { ImageHandle } from "@/storage/ImageHandle";

import { diffImages } from ".";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const tests = [
  ["alphaBackground", 0.5, false],
  ["alphaSmallGraph", 0.2, true],
  ["big-images", 0.5, true],
  ["border", 0.5, false],
  ["boxShadow", 0.5, false],
  ["fontAliasing", 0.5, false],
  ["imageCompression1", 0.5, false],
  ["imageCompression2", 0.5, false],
  ["imageCompression3", 0.5, false],
  ["imageCompression4", 0.5, false],
  ["imageCompression4", 0.5, false],
  ["imageCompression5", 0.5, false],
  ["imageCompression6", 0.5, false],
  ["imageCompression7", 0.5, false],
  ["simple", 0.5, true],
  ["tableAlpha", 0.5, true],
  ["minorChange1", 0.5, true],
  ["minorChange2", 0.5, false],
  ["minorChange3", 0, true],
  ["different-dimensions", 0, true],
  ["layoutShift", 0.5, true],
  ["layoutShiftRemoved", 0.5, true],
];

describe("#diffImages", () => {
  test.each(tests)("diffImages %s", async (name, threshold, hasDiff) => {
    const dir = resolve(__dirname, `__fixtures__/${name}`);
    const baseImage = new ImageHandle({
      fileHandle: new LocalFileHandle({
        filepath: resolve(dir, "base.png"),
      }),
    });
    const compareImage = new ImageHandle({
      fileHandle: new LocalFileHandle({
        filepath: resolve(dir, "compare.png"),
      }),
    });

    const result = await diffImages(baseImage, compareImage, {
      threshold: Number(threshold),
    });

    const diffPath = resolve(dir, "diff_tmp.png");
    await unlink(diffPath).catch(() => {});

    if (result?.file) {
      await copyFile(result.file.path, diffPath);
    }

    expect(result.score > 0).toBe(hasDiff);
  });
});

function loadImage(dir: string, name: string) {
  return new ImageHandle({
    fileHandle: new LocalFileHandle({ filepath: resolve(dir, name) }),
  });
}

/**
 * Count red (diff) pixels of a mask in the given row range.
 */
async function countRedPixels(
  maskPath: string,
  rowRange?: { from: number; to: number },
) {
  const { data, info } = await sharp(maskPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const from = rowRange?.from ?? 0;
  const to = rowRange?.to ?? info.height;
  let count = 0;
  for (let y = from; y < to; y++) {
    for (let x = 0; x < info.width; x++) {
      const idx = (y * info.width + x) * info.channels;
      const [r, g, b, a] = [
        data[idx]!,
        data[idx + 1]!,
        data[idx + 2]!,
        data[idx + 3]!,
      ];
      if (r >= 200 && g <= 90 && b <= 90 && a >= 16) {
        count++;
      }
    }
  }
  return count;
}

// The layoutShift fixtures are built from minorChange1/base.png (1125x2436)
// with a 400px section inserted at y=800 (resulting height: 2836).
const SECTION_TOP = 800;
const SECTION_HEIGHT = 400;
const SECTION_BOTTOM = SECTION_TOP + SECTION_HEIGHT;
const WIDTH = 1125;
const FULL_HEIGHT = 2836;

describe("#diffImages layout shift", () => {
  test("an inserted section marks only the section, not the shifted content below", async () => {
    const dir = resolve(__dirname, "__fixtures__/layoutShift");
    const result = await diffImages(
      loadImage(dir, "base.png"),
      loadImage(dir, "compare.png"),
      { threshold: 0.5 },
    );

    // The build must still be flagged, with a score close to the fraction of
    // inserted content (400/2836 ≈ 0.14) instead of everything below the
    // section (≈ 0.72 with the classic diff).
    expect(result.score).toBeGreaterThan(0.12);
    expect(result.score).toBeLessThan(0.25);
    expect(result.file).toBeDefined();

    const sectionArea = WIDTH * SECTION_HEIGHT;
    const redInSection = await countRedPixels(result.file!.path, {
      from: SECTION_TOP,
      to: SECTION_BOTTOM,
    });
    const redAbove = await countRedPixels(result.file!.path, {
      from: 0,
      to: SECTION_TOP,
    });
    const redBelow = await countRedPixels(result.file!.path, {
      from: SECTION_BOTTOM,
      to: FULL_HEIGHT,
    });

    // The inserted section is fully marked as changed...
    expect(redInSection).toBeGreaterThan(sectionArea * 0.95);
    // ...while the identical (but shifted) content around it stays clean.
    expect(redAbove).toBeLessThan(WIDTH * SECTION_TOP * 0.01);
    expect(redBelow).toBeLessThan(
      WIDTH * (FULL_HEIGHT - SECTION_BOTTOM) * 0.01,
    );
  });

  test("a removed section is scored and marked with a seam", async () => {
    const dir = resolve(__dirname, "__fixtures__/layoutShiftRemoved");
    const result = await diffImages(
      loadImage(dir, "base.png"),
      loadImage(dir, "compare.png"),
      { threshold: 0.5 },
    );

    // Deleted rows count toward the score (400/2836 ≈ 0.14).
    expect(result.score).toBeGreaterThan(0.12);
    expect(result.score).toBeLessThan(0.25);
    expect(result.file).toBeDefined();

    // The mask shows a thin seam where the section was removed, and the
    // shifted content below is not polluted.
    const redTotal = await countRedPixels(result.file!.path);
    expect(redTotal).toBeGreaterThan(0);
    expect(redTotal).toBeLessThan(WIDTH * FULL_HEIGHT * 0.01);

    const redAtSeam = await countRedPixels(result.file!.path, {
      from: SECTION_TOP,
      to: SECTION_TOP + 8,
    });
    expect(redAtSeam).toBeGreaterThan(0);
  });
});
