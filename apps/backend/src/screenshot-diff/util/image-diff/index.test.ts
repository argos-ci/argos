/* eslint-disable @typescript-eslint/no-unused-vars */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { copyFile, unlink } from "node:fs/promises";

import { LocalImageFile } from "@/storage/index.js";

import { diffImages } from "./index.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const tests = [
  ["alphaBackground", false],
  ["big-images", true],
  ["border", false],
  ["boxShadow", false],
  ["fontAliasing", false],
  ["imageCompression1", false],
  ["imageCompression2", false],
  ["imageCompression3", false],
  ["imageCompression4", false],
  ["imageCompression4", false],
  ["imageCompression5", false],
  ["imageCompression6", false],
  ["imageCompression7", false],
  ["simple", true],
  ["tableAlpha", true],
  ["minorChange1", true],
  ["minorChange2", true],
];

describe("#diffImages", () => {
  test.each(tests)("diffImages %s", async (name, hasDiff) => {
    const dir = resolve(__dirname, `__fixtures__/${name}`);

    const result = await diffImages(
      new LocalImageFile({
        filepath: resolve(dir, "compare.png"),
      }),
      new LocalImageFile({
        filepath: resolve(dir, "base.png"),
      }),
    );

    const diffPath = resolve(dir, "diff_tmp.png");
    await unlink(diffPath).catch(() => {});

    if (result) {
      await copyFile(result.filepath, diffPath);
    }

    expect(Boolean(result)).toBe(hasDiff);
  });
});
