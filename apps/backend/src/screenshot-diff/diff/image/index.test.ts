import { copyFile, mkdtemp, rm, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { crc32 } from "node:zlib";
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
];

/**
 * A PNG that claims to be `width` x `height` with no pixels behind it: what a
 * decompression bomb, or an absurdly long page, looks like from its header.
 */
function pngClaiming(width: number, height: number): Buffer {
  const chunk = (kind: string, data: Buffer) => {
    const body = Buffer.concat([Buffer.from(kind, "ascii"), data]);
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const checksum = Buffer.alloc(4);
    checksum.writeUInt32BE(crc32(body));
    return Buffer.concat([length, body, checksum]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  // 8-bit RGBA, deflate, adaptive filtering, not interlaced.
  header.set([8, 6, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk(
      "IDAT",
      Buffer.from([0x78, 0x9c, 0x03, 0x00, 0x00, 0x00, 0x00, 0x01]),
    ),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

test("reports images too large to hold in memory as changed, without decoding them", async () => {
  const directory = await mkdtemp(join(tmpdir(), "diff-too-large-"));
  const write = async (name: string, width: number, height: number) => {
    const path = join(directory, name);
    await writeFile(path, pngClaiming(width, height));
    return new ImageHandle({
      fileHandle: new LocalFileHandle({ filepath: path }),
    });
  };
  const small = new ImageHandle({
    fileHandle: new LocalFileHandle({
      filepath: resolve(__dirname, "__fixtures__/simple/base.png"),
    }),
  });
  // Each under sharp's own 268 MP limit, together over the 1 GB a comparison
  // may take: decoding them would fail on the missing pixels, after
  // allocating them.
  const tall = await write("tall.png", 16_000, 16_000);
  const wide = await write("wide.png", 12_000, 12_000);
  const wider = await write("wider.png", 12_000, 12_000);

  expect(await diffImages(tall, small, {})).toEqual({ score: 1 });
  expect(await diffImages(small, tall, {})).toEqual({ score: 1 });
  expect(await diffImages(wide, wider, {})).toEqual({ score: 1 });
  await rm(directory, { recursive: true, force: true });
});

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
