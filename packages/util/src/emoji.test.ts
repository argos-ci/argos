import { describe, expect, it } from "vitest";

import { isValidEmoji, normalizeEmoji } from "./emoji";

const VS16 = "\u{FE0F}";

describe("normalizeEmoji", () => {
  it.each([
    ["drops a redundant trailing VS16", `👍${VS16}`, "👍"],
    ["drops every redundant VS16", `✅${VS16}${VS16}`, "✅"],
    ["keeps an emoji without VS16", "👍", "👍"],
    ["keeps a VS16 the emoji needs", `❤${VS16}`, `❤${VS16}`],
    [
      "keeps a VS16 inside a ZWJ sequence",
      `🏳${VS16}\u{200D}🌈`,
      `🏳${VS16}\u{200D}🌈`,
    ],
    ["keeps a keycap's VS16", `1${VS16}\u{20E3}`, `1${VS16}\u{20E3}`],
    ["keeps a skin-tone modifier", "👍🏽", "👍🏽"],
    ["leaves text alone", `lgtm${VS16}`, `lgtm${VS16}`],
  ])("%s", (_name, value, expected) => {
    expect(normalizeEmoji(value)).toBe(expected);
  });
});

describe("isValidEmoji", () => {
  it.each([
    ["a simple emoji", "👍"],
    ["an emoji with a redundant VS16", `👍${VS16}`],
    ["an emoji that needs its VS16", `❤${VS16}`],
    ["an emoji with a skin-tone modifier", "👍🏽"],
    ["a ZWJ sequence", "👨‍👩‍👧‍👦"],
  ])("accepts %s", (_name, value) => {
    expect(isValidEmoji(value)).toBe(true);
  });

  it.each([
    ["plain text", "lgtm"],
    ["digits", "123"],
    ["an empty string", ""],
    ["an emoji with trailing text", "👍lgtm"],
    ["multiple emojis", "👍🎉"],
    ["a lone VS16", VS16],
    ["a text-presentation character without its VS16", "❤"],
    ["a non-string value", undefined],
    ["a number", 42],
  ])("rejects %s", (_name, value) => {
    expect(isValidEmoji(value)).toBe(false);
  });
});
