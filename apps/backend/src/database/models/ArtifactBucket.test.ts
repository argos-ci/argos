import { describe, expect, it } from "vitest";

import { ArtifactBucket } from "./ArtifactBucket";

const baseData = {
  name: "878",
  branch: "BUGS-130",
  commit: "ff4474843ccab36e72814e321cbf6ab6a6303385",
  valid: true,
  complete: true,
};

describe("ArtifactBucket", () => {
  describe("validation commit", () => {
    it("should throw if the buckets are the same", () => {
      expect.assertions(1);
      try {
        ArtifactBucket.fromJson({
          ...baseData,
          commit: "esfsefsfsef",
        });
      } catch (error) {
        if (!(error instanceof Error)) {
          throw error;
        }
        expect(error.message).toBe(
          'commit: must match pattern "^[0-9a-f]{40}$"',
        );
      }
    });

    it("should not throw if the buckets are different", () => {
      expect(() => {
        ArtifactBucket.fromJson(baseData);
      }).not.toThrow();
    });
  });
});
