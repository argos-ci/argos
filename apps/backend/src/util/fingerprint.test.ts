import { describe, expect, it } from "vitest";

import { decodeFingerprint, encodeFingerprint } from "./fingerprint";

const HASH = "3fa1c2e9a4b8d210";
const FULL = "v1:g16:d1:t0.002,0.02,0.08:3fa1c2e9a4b8d210";

describe("fingerprint encoding", () => {
  it("strips the prefix from a fingerprint", () => {
    expect(encodeFingerprint(FULL)).toBe(`v1${HASH}`);
  });

  it("adds the prefix to a token", () => {
    expect(decodeFingerprint(`v1${HASH}`)).toBe(FULL);
  });

  it("does not encode invalid fingerprints", () => {
    expect(encodeFingerprint(`v2:${HASH}`)).toBe(`v2:${HASH}`);
  });

  it("do esnot decode invalid fingerprints", () => {
    expect(decodeFingerprint(`v2:${HASH}`)).toBe(`v2:${HASH}`);
  });
});
