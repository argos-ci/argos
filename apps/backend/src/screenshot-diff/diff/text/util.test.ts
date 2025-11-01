import { describe, expect, it } from "vitest";

import { getDiffScore } from "./util";

describe("getDiffScore", () => {
  it("should return 0 for identical strings", () => {
    expect(getDiffScore("hello", "hello")).toBe(0);
  });

  it("should return 0 for empty strings", () => {
    expect(getDiffScore("", "")).toBe(0);
  });

  it("should return 1 for completely different strings of same length", () => {
    expect(getDiffScore("abc", "xyz")).toBe(1);
  });

  it("should return 1 when base is empty and head is not", () => {
    expect(getDiffScore("", "hello")).toBe(1);
  });

  it("should return 1 when head is empty and base is not", () => {
    expect(getDiffScore("hello", "")).toBe(1);
  });

  it("should calculate correct ratio for partial differences", () => {
    const ratio = getDiffScore("hello", "hallo");
    expect(ratio).toBeGreaterThan(0);
    expect(ratio).toBeLessThan(1);
  });

  it("should calculate correct ratio for added characters", () => {
    const ratio = getDiffScore("test", "testing");
    expect(ratio).toBeGreaterThan(0);
    expect(ratio).toBeLessThan(1);
  });

  it("should calculate correct ratio for removed characters", () => {
    const ratio = getDiffScore("testing", "test");
    expect(ratio).toBeGreaterThan(0);
    expect(ratio).toBeLessThan(1);
  });

  it("should handle multiline text", () => {
    const base = "line1\nline2\nline3";
    const head = "line1\nmodified\nline3";
    const ratio = getDiffScore(base, head);
    expect(ratio).toBeGreaterThan(0);
    expect(ratio).toBeLessThan(1);
  });

  it("should handle special characters", () => {
    const ratio = getDiffScore("hello@world", "hello#world");
    expect(ratio).toBeGreaterThan(0);
    expect(ratio).toBeLessThan(1);
  });
});
