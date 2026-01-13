import path from "node:path";
import { fingerprintDiff } from "@argos-ci/mask-fingerprint";
import { describe, expect, it } from "vitest";

describe("diff fingerprint", () => {
  it("generates a same fingerprint for similar diffs", async () => {
    const fixturesDir = path.join(__dirname, "./__fixtures__");

    const fA1 = await fingerprintDiff(path.join(fixturesDir, "diff-A1.png"));
    const fA2 = await fingerprintDiff(path.join(fixturesDir, "diff-A2.png"));
    const fA3 = await fingerprintDiff(path.join(fixturesDir, "diff-A3.png"));
    const fB1 = await fingerprintDiff(path.join(fixturesDir, "diff-B1.png"));
    const fLong = await fingerprintDiff(
      path.join(fixturesDir, "long-diff.png"),
    );

    expect(fA1).toBe(fA2);
    expect(fA1).toBe(fA3);
    expect(fA1).not.toBe(fB1);
    expect(fLong).not.toBe(fB1);
  });
});
