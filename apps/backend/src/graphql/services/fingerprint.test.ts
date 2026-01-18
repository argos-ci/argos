import { describe, expect, it } from "vitest";

import { decodeFingerprint, encodeFingerprint } from "./fingerprint";

const HASH = "3fa1c2e9a4b8d210";
const FULL = "v1:g16:d1:t0.002,0.02,0.08:3fa1c2e9a4b8d210";

describe("fingerprint encoding", () => {
  it("strips the prefix from a fingerprint", () => {
    expect(encodeFingerprint(FULL)).toBe(HASH);
  });

  it("adds the prefix to a token", () => {
    expect(decodeFingerprint(HASH)).toBe(FULL);
  });

  it("returns the full fingerprint when already prefixed", () => {
    expect(decodeFingerprint(FULL)).toBe(FULL);
  });

  it("rejects invalid fingerprints", () => {
    expect(() => encodeFingerprint(`v2:${HASH}`)).toThrow(
      "Invalid fingerprint format",
    );
  });

  it("rejects invalid tokens", () => {
    expect(() => decodeFingerprint("v2:deadbeef")).toThrow(
      "Invalid fingerprint token",
    );
  });
});
