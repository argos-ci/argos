import { describe, expect, it } from "vitest";

import { ArtifactDiff } from "./ArtifactDiff";

const baseData = {
  buildId: "1",
  baseArtifactId: "1",
  headArtifactId: "2",
  jobStatus: "pending",
};

describe("models/ArtifactDiff", () => {
  describe("validation", () => {
    it("should throw if the score is invalid", () => {
      expect(() => {
        ArtifactDiff.fromJson({
          ...baseData,
          score: 2,
        });
      }).toThrow("score: must be <= 1");
    });

    it("should not throw if the score is valid", () => {
      expect(() => {
        ArtifactDiff.fromJson({
          ...baseData,
          score: 1,
        });
      }).not.toThrow();
    });

    it("should throw if the artifacts are the same", () => {
      expect(() => {
        ArtifactDiff.fromJson({
          ...baseData,
          headArtifactId: "1",
        });
      }).toThrow("The base artifact should be different to the head one.");
    });

    it("should not throw if the artifacts are different", () => {
      expect(() => {
        ArtifactDiff.fromJson(baseData);
      }).not.toThrow();
    });
  });
});
