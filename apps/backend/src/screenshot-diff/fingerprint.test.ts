// tests/diff-fingerprint.test.ts
import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";
import { describe, expect, it } from "vitest";

import { fingerprintDiffForEquality } from "./fingerprint";

function readPngRgba(filePath: string): {
  rgba: Uint8Array;
  width: number;
  height: number;
} {
  const buffer = fs.readFileSync(filePath);
  const png = PNG.sync.read(buffer);
  return {
    rgba: png.data,
    width: png.width,
    height: png.height,
  };
}

describe("diff fingerprint", () => {
  it("generates a same fingerprint for similar diffs", () => {
    const fixturesDir = path.join(__dirname, "./__fixtures__");

    const generateFingerprintFromFilename = (name: string) => {
      const diffPath = path.join(fixturesDir, name);
      const diff = readPngRgba(diffPath);
      return fingerprintDiffForEquality(diff.rgba, diff.width, diff.height, {
        gridSize: 16,
        dilateRadius: 1,
        // tweak these if needed
        densityThresholds: [0.002, 0.02, 0.08],
        padToSquare: true,
      });
    };

    const fA1 = generateFingerprintFromFilename("diff-A1.png");
    const fA2 = generateFingerprintFromFilename("diff-A2.png");
    const fA3 = generateFingerprintFromFilename("diff-A3.png");
    const fB1 = generateFingerprintFromFilename("diff-B1.png");

    expect(fA1).toBe(fA2);
    expect(fA1).toBe(fA3);
    expect(fA1).not.toBe(fB1);
  });
});
