import { describe, expect, it } from "vitest";

import { isValidPgBigInt } from "./biginteger";

describe("isValidPgBigInt", () => {
  it("returns `true` for valid PostgreSQL bigint values", () => {
    expect(isValidPgBigInt("123")).toBe(true);
    expect(isValidPgBigInt("9223372036854775807")).toBe(true);
    expect(isValidPgBigInt("-9223372036854775808")).toBe(true);
    expect(isValidPgBigInt("0")).toBe(true);
    expect(isValidPgBigInt("")).toBe(true);
    expect(isValidPgBigInt("  ")).toBe(true);
  });

  it("returns `false` for values outside the PostgreSQL bigint range", () => {
    expect(isValidPgBigInt("9223372036854775808")).toBe(false);
    expect(isValidPgBigInt("-9223372036854775809")).toBe(false);
  });

  it("returns `false` for non-integer values", () => {
    expect(() => isValidPgBigInt("1.5")).toThrow();
    expect(() => isValidPgBigInt("NaN")).toThrow();
    expect(() => isValidPgBigInt("Infinity")).toThrow();
  });

  it("throws for invalid bigint inputs", () => {
    expect(() => isValidPgBigInt("abc")).toThrow();
    expect(() => isValidPgBigInt("123abc")).toThrow();
  });
});
