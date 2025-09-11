import { describe, expect, it } from "vitest";

import { computeAdditionalScreenshots } from "./additional-screenshots";

describe("computeAdditionalScreenshots", () => {
  it("returns zero additional when all screenshots are included", () => {
    const result = computeAdditionalScreenshots({
      neutral: 8,
      storybook: 2,
      included: 8,
    });
    expect(result).toEqual({ neutral: 0, storybook: 2 });
  });

  it("returns additional screenshots when neutral exceeds included", () => {
    const result = computeAdditionalScreenshots({
      neutral: 10,
      storybook: 5,
      included: 8,
    });
    expect(result).toEqual({ neutral: 2, storybook: 5 });
  });

  it("fills remaining included with storybook screenshots", () => {
    const result = computeAdditionalScreenshots({
      neutral: 2,
      storybook: 12,
      included: 8,
    });
    expect(result).toEqual({ neutral: 0, storybook: 6 });
  });

  it("handles case when storybook screenshots are less than needed", () => {
    const result = computeAdditionalScreenshots({
      neutral: 4,
      storybook: 2,
      included: 8,
    });
    expect(result).toEqual({ neutral: 0, storybook: 0 });
  });

  it("returns zero when all and included are zero", () => {
    const result = computeAdditionalScreenshots({
      neutral: 0,
      storybook: 0,
      included: 0,
    });
    expect(result).toEqual({ neutral: 0, storybook: 0 });
  });

  it("does not return negative values", () => {
    const result = computeAdditionalScreenshots({
      neutral: 2,
      storybook: 5,
      included: 10,
    });
    expect(result.neutral).toBeGreaterThanOrEqual(0);
    expect(result.storybook).toBeGreaterThanOrEqual(0);
  });
});
