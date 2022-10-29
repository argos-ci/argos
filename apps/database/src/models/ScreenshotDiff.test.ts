import { ScreenshotDiff } from "./ScreenshotDiff.js";

const baseData = {
  buildId: "1",
  baseScreenshotId: "1",
  compareScreenshotId: "2",
  jobStatus: "pending",
  validationStatus: "unknown",
};

describe("models/ScreenshotDiff", () => {
  describe("validation", () => {
    it("should throw if the score is invalid", () => {
      expect(() => {
        ScreenshotDiff.fromJson({
          ...baseData,
          score: 2,
        });
      }).toThrow("should be <= 1");
    });

    it("should not throw if the score is valid", () => {
      expect(() => {
        ScreenshotDiff.fromJson({
          ...baseData,
          score: 1,
        });
      }).not.toThrow();
    });

    it("should throw if the screenshots are the same", () => {
      expect(() => {
        ScreenshotDiff.fromJson({
          ...baseData,
          compareScreenshotId: "1",
        });
      }).toThrow("The base screenshot should be different to the compare one.");
    });

    it("should not throw if the screenshots are different", () => {
      expect(() => {
        ScreenshotDiff.fromJson(baseData);
      }).not.toThrow();
    });
  });
});
