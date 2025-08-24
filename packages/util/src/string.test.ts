import { describe, expect, it } from "vitest";

import { firstUpper, truncate } from "./string";

describe("#firstUpper", () => {
  it("turns the first letter of a string to uppercase", () => {
    expect(firstUpper("hello")).toBe("Hello");
  });

  it("returns empty string if input is empty", () => {
    expect(firstUpper("")).toBe("");
  });

  it("does not change first letter if already uppercase", () => {
    expect(firstUpper("Hello")).toBe("Hello");
  });

  it("works with single character", () => {
    expect(firstUpper("a")).toBe("A");
  });

  it("works with non-letter first character", () => {
    expect(firstUpper("1hello")).toBe("1hello");
  });
});

describe("#truncate", () => {
  it("truncates a string to a maximum length and adds an ellipsis", () => {
    expect(truncate("hello world", 5)).toBe("hell…");
  });

  it("prefers to truncate between words if possible", () => {
    expect(truncate("hello world", 8)).toBe("hello…");
  });

  it("returns the original string if shorter than maxLength", () => {
    expect(truncate("short", 10)).toBe("short");
  });

  it("returns the original string if equal to maxLength", () => {
    expect(truncate("exactlyten", 10)).toBe("exactlyten");
  });

  it("handles empty string", () => {
    expect(truncate("", 5)).toBe("");
  });

  it("truncates long single word", () => {
    expect(truncate("supercalifragilisticexpialidocious", 10)).toBe(
      "supercali…",
    );
  });

  it("handles maxLength of 1", () => {
    expect(truncate("hello", 1)).toBe("…");
  });

  it("handles string with punctuation", () => {
    expect(truncate("hello, world!", 8)).toBe("hello,…");
  });

  it("does not add ellipsis if string fits exactly", () => {
    expect(truncate("hello", 5)).toBe("hello");
  });
});
