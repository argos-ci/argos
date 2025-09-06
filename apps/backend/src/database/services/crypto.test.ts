import { describe, expect, it } from "vitest";

import { generateRandomDigits, generateRandomHexString } from "./crypto";

describe("generateRandomHexString", () => {
  it("generates a hex string of the correct length", async () => {
    const length = 16;
    const hex = await generateRandomHexString(length);
    expect(typeof hex).toBe("string");
    expect(hex.length).toBe(length);
    expect(hex).toMatch(/^[a-f0-9]+$/i);
  });

  it("generates different values on subsequent calls", async () => {
    const hex1 = await generateRandomHexString(16);
    const hex2 = await generateRandomHexString(16);
    expect(hex1).not.toBe(hex2);
  });
});

describe("generateRandomDigits", () => {
  it("generates a number", async () => {
    const length = 6;
    const digits = await generateRandomDigits(length);
    expect(String(digits).length).toBe(length);
    expect(typeof digits).toBe("string");
  });

  it("generates different values on subsequent calls", async () => {
    const digits1 = await generateRandomDigits(6);
    const digits2 = await generateRandomDigits(6);
    expect(digits1).not.toBe(digits2);
  });
});
