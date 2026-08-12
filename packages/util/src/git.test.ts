import { describe, expect, it } from "vitest";

import { findCommitShas } from "./git";

/** The shas found in a text, as plain strings — most cases only need those. */
function shas(text: string): string[] {
  return findCommitShas(text).map((match) => match.sha);
}

describe("findCommitShas", () => {
  it("finds an abbreviated sha in a sentence", () => {
    expect(findCommitShas("Pushed to the PR in d15cba5.")).toEqual([
      { sha: "d15cba5", index: 20 },
    ]);
  });

  it("finds a full 40-character sha", () => {
    const sha = "9f2c1a7b3e4d5c6a8b0f1e2d3c4b5a6978d0e1f2";
    expect(shas(`Reverted ${sha} on main`)).toEqual([sha]);
  });

  it("finds several shas in one text", () => {
    expect(shas("Squashed abc1234 and 7fed210 together")).toEqual([
      "abc1234",
      "7fed210",
    ]);
  });

  it("matches at the very start and end of the text", () => {
    expect(shas("d15cba5")).toEqual(["d15cba5"]);
    expect(shas("d15cba5 fixed it, then f00ba12")).toEqual([
      "d15cba5",
      "f00ba12",
    ]);
  });

  it("accepts surrounding punctuation and brackets", () => {
    expect(shas("(d15cba5)")).toEqual(["d15cba5"]);
    expect(shas("see d15cba5, then abc1234!")).toEqual(["d15cba5", "abc1234"]);
    expect(shas("v2.d15cba5")).toEqual(["d15cba5"]);
  });

  it("ignores runs shorter than 7 or longer than 40 characters", () => {
    expect(shas("abc123 is too short")).toEqual([]);
    // A sha256 is 64 characters — not a commit sha, and not the first 40 of one.
    expect(
      shas("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"),
    ).toEqual([]);
  });

  it("ignores plain numbers", () => {
    expect(shas("We now render 2000000 pixels")).toEqual([]);
    expect(shas("Order 1234567 shipped")).toEqual([]);
  });

  it("ignores hex-only words", () => {
    expect(shas("The team acceded and defaced the facade")).toEqual([]);
  });

  it("ignores a run glued to a word character", () => {
    expect(shas("0xabc1234 and abc1234z and z1234abc")).toEqual([]);
  });

  it("ignores branch and asset names", () => {
    expect(shas("Merged fix-abc1234 into main")).toEqual([]);
    expect(shas("Loaded chunk-abc1234.js")).toEqual([]);
  });

  it("ignores a sha that is already part of a URL", () => {
    expect(
      shas("https://github.com/argos-ci/argos/commit/d15cba5 is the one"),
    ).toEqual([]);
  });

  it("ignores CSS colors", () => {
    expect(shas("The border should be #a1b2c3d4 instead")).toEqual([]);
  });

  it("ignores uppercase hex", () => {
    expect(shas("Request AB12CD34 failed")).toEqual([]);
  });

  it("returns nothing for text without hex runs", () => {
    expect(shas("")).toEqual([]);
    expect(shas("Looks good to me!")).toEqual([]);
  });
});
