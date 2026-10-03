import { describe, expect, it } from "vitest";

import { checkIsStorybookScreenshot } from "./argos-sdk";

function metadata(sdkName: string, automationLibraryName: string) {
  return {
    sdk: { name: sdkName, version: "1.0.0" },
    automationLibrary: { name: automationLibraryName, version: "1.0.0" },
  };
}

describe("checkIsStorybookScreenshot", () => {
  it("matches screenshots uploaded by the Storybook SDK", () => {
    expect(
      checkIsStorybookScreenshot(
        metadata("@argos-ci/storybook", "@storybook/test-runner"),
      ),
    ).toBe(true);
  });

  it("matches screenshots of stories uploaded by other SDKs", () => {
    expect(
      checkIsStorybookScreenshot(metadata("@argos-ci/vitest", "storybook")),
    ).toBe(true);
    expect(
      checkIsStorybookScreenshot(
        metadata("@argos-ci/vitest", "@storybook/addon-vitest"),
      ),
    ).toBe(true);
  });

  it("does not match other screenshots", () => {
    expect(
      checkIsStorybookScreenshot(metadata("@argos-ci/vitest", "vitest")),
    ).toBe(false);
    expect(
      checkIsStorybookScreenshot(
        metadata("@argos-ci/playwright", "@playwright/test"),
      ),
    ).toBe(false);
    expect(checkIsStorybookScreenshot(null)).toBe(false);
  });
});
