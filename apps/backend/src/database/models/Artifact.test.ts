import { describe, it } from "vitest";

import { Artifact } from "./Artifact";

describe("Artifact", () => {
  describe("metadata validation", () => {
    // eslint-disable-next-line vitest/expect-expect
    it("validates URL with placeholders `{{}}`", () => {
      Artifact.fromJson({
        name: "X",
        s3Id: "x",
        artifactBucketId: "artifact-bucket-id",
        metadata: {
          sdk: { name: "@argos-ci/storybook", version: "0.2.1" },
          url: "http://127.0.0.1:6006/storybook/iframe.html?id=foundation-typography--default&viewMode={{viewMode}}",
          test: null,
          browser: { name: "chromium", version: "128.0.6613.18" },
          viewport: { width: 1280, height: 720 },
          mediaType: "screen",
          colorScheme: "light",
          automationLibrary: {
            name: "@storybook/test-runner",
            version: "0.19.1",
          },
        },
      });
    });
  });
});
