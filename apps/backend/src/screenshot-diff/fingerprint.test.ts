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

    const noEnd1 = await fingerprintDiff(
      path.join(fixturesDir, "no-end-1.png"),
    );
    const noEnd2 = await fingerprintDiff(
      path.join(fixturesDir, "no-end-2.png"),
    );

    expect(noEnd1).toBe("v1:g16:d1:t0.002,0.02,0.08:ccb73aa8a5d0317b");
    expect(noEnd2).toBe("v1:g16:d1:t0.002,0.02,0.08:badfb9bd5eea0beb");

    expect(fA1).toBe(fA2);
    expect(fA1).toBe(fA3);
    expect(fA1).not.toBe(fB1);
    expect(fLong).not.toBe(fB1);
  });
});
