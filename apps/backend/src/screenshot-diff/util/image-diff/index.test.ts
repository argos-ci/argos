/* eslint-disable @typescript-eslint/no-unused-vars */
import { copyFile, unlink } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

import { LocalImageFile } from "@/storage/index.js";

import { diffImages } from "./index.js";

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
  ["minorChange2", 0.5, true],
];

describe("#diffImages", () => {
  test.each(tests)("diffImages %s", async (name, threshold, hasDiff) => {
    const dir = resolve(__dirname, `__fixtures__/${name}`);

    const result = await diffImages(
      new LocalImageFile({
        filepath: resolve(dir, "compare.png"),
      }),
      new LocalImageFile({
        filepath: resolve(dir, "base.png"),
      }),
      Number(threshold),
    );

    const diffPath = resolve(dir, "diff_tmp.png");
    await unlink(diffPath).catch(() => {});

    if (result) {
      await copyFile(result.filepath, diffPath);
    }

    expect(Boolean(result)).toBe(hasDiff);
  });
});
