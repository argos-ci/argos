import { readFile, unlink } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { fingerprintDiff } from "@argos-ci/iris";
import sharp from "sharp";
import { describe, expect, test } from "vitest";

import { LocalFileHandle } from "@/storage/FileHandle";
import { ImageHandle } from "@/storage/ImageHandle";
import { hashFileSha256 } from "@/util/hash";

import { diffImages } from ".";

const here = fileURLToPath(new URL(".", import.meta.url));

type Recorded = {
  base: string;
  head: string;
  threshold: number;
  score: number;
  fingerprint: string | null;
  width: number | null;
  height: number | null;
};

/**
 * What the odiff pipeline returned — sharp padding, two odiff 4.5.0 runs and
 * `@argos-ci/mask-fingerprint` — recorded on b48cfe2d3 for every fixture
 * pair, as PNG and re-encoded as JPEG and WebP, at several sensitivities.
 * Verdicts come from these scores and ignore rules are keyed on these
 * fingerprints, so the engine has to keep returning them exactly.
 *
 * Left out on purpose: pairs where one image is smaller in both directions,
 * which sharp scaled up before comparing, and pairs over 80 megapixels,
 * which the old pipeline cropped.
 */
const recorded: Recorded[] = JSON.parse(
  await readFile(resolve(here, "__fixtures__/odiff-results.json"), "utf8"),
);

const image = (path: string) =>
  new ImageHandle({
    fileHandle: new LocalFileHandle({ filepath: resolve(here, path) }),
  });

describe("diffImages, against the odiff pipeline it replaced", () => {
  test.each(recorded.map((entry) => [entry.base, entry.threshold, entry]))(
    "%s at sensitivity %s",
    async (_name, threshold, expected) => {
      const result = await diffImages(
        image(expected.base),
        image(expected.head),
        {
          threshold,
        },
      );
      expect({
        score: result.score,
        fingerprint: result.file?.fingerprint ?? null,
        width: result.file?.width ?? null,
        height: result.file?.height ?? null,
      }).toEqual({
        score: expected.score,
        fingerprint: expected.fingerprint,
        width: expected.width,
        height: expected.height,
      });

      if (result.file) {
        // The diff is stored under `sha256` and grouped by `fingerprint`
        // without reading the file again: both must describe what was
        // written.
        const { path, sha256, fingerprint, width, height } = result.file;
        expect(await hashFileSha256(path)).toBe(sha256);
        expect(await fingerprintDiff(path)).toBe(fingerprint);
        expect(await sharp(path).metadata()).toMatchObject({
          width,
          height,
          format: "png",
        });
        await unlink(path);
      }
    },
  );
});
