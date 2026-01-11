// tests/diff-fingerprint.test.ts
import fs from "node:fs/promises";
import path from "node:path";
import { fingerprintDiff } from "@argos-ci/mask-fingerprint";
import { describe, expect, it } from "vitest";

describe("diff fingerprint", () => {
  it("generates a same fingerprint for similar diffs", async () => {
    const fixturesDir = path.join(__dirname, "./__fixtures__");

    const generateFingerprintFromFilename = async (name: string) => {
      const diffPath = path.join(fixturesDir, name);
      const buffer = await fs.readFile(diffPath);
      console.time(name);
      const res = fingerprintDiff(buffer);
      console.timeEnd(name);
      return res;
    };

    const fA1 = await generateFingerprintFromFilename("diff-A1.png");
    const fA2 = await generateFingerprintFromFilename("diff-A2.png");
    const fA3 = await generateFingerprintFromFilename("diff-A3.png");
    const fB1 = await generateFingerprintFromFilename("diff-B1.png");
    const fLong = await generateFingerprintFromFilename("long-diff.png");

    expect(fA1).toBe(fA2);
    expect(fA1).toBe(fA3);
    expect(fA1).not.toBe(fB1);
    expect(fLong).not.toBe(fB1);
  });
});
