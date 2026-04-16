import { describe, expect, it } from "vitest";

import { generateRandomDigits, generateRandomString } from "./crypto";

describe("generateRandomString", () => {
  it("generates a hex string of the correct length", () => {
    const length = 16;
    const hex = generateRandomString(length);
    expect(typeof hex).toBe("string");
    expect(hex.length).toBe(length);
    expect(hex).toMatch(/^[a-z0-9]+$/i);
  });

  it("generates different values on subsequent calls", () => {
    const hex1 = generateRandomString(16);
    const hex2 = generateRandomString(16);
    expect(hex1).not.toBe(hex2);
  });
});

describe("generateRandomDigits", () => {
  it("generates a number", () => {
    const length = 6;
    const digits = generateRandomDigits(length);
    expect(String(digits).length).toBe(length);
    expect(typeof digits).toBe("string");
  });

  it("generates different values on subsequent calls", () => {
    const digits1 = generateRandomDigits(6);
    const digits2 = generateRandomDigits(6);
    expect(digits1).not.toBe(digits2);
  });
});
