import { describe, expect, it } from "vitest";

import { ScreenshotBucket } from "./ScreenshotBucket.js";

const baseData = {
  name: "878",
  branch: "BUGS-130",
  commit: "ff4474843ccab36e72814e321cbf6ab6a6303385",
  valid: true,
  complete: true,
};

describe("ScreenshotBucket", () => {
  describe("validation commit", () => {
    it("should throw if the screenshot buckets are the same", () => {
      expect.assertions(1);
      try {
        ScreenshotBucket.fromJson({
          ...baseData,
          commit: "esfsefsfsef",
        });
      } catch (error: any) {
        expect(error.message).toBe(
          'commit: must match pattern "^[0-9a-f]{40}$"',
        );
      }
    });

    it("should not throw if the screenshot buckets are different", () => {
      expect(() => {
        ScreenshotBucket.fromJson(baseData);
      }).not.toThrow();
    });
  });
});
