import { describe, expect, it } from "vitest";

import { ScreenshotMetadataSchema } from "./screenshot-metadata";

/** The two fields every SDK sends, so a case states only what it is about. */
const base = {
  automationLibrary: { name: "playwright", version: "1.49.1" },
  sdk: { name: "@argos-ci/playwright", version: "6.0.0" },
};

describe("ScreenshotMetadataSchema", () => {
  // Unknown keys are stripped, so a field the SDK sends and the schema does
  // not declare is dropped on arrival without an error anywhere.
  it("keeps the capture index", () => {
    expect(
      ScreenshotMetadataSchema.parse({ ...base, capture: { index: 3 } })
        .capture,
    ).toEqual({ index: 3 });
  });

  it("rejects a capture index that is not a position", () => {
    expect(
      ScreenshotMetadataSchema.safeParse({ ...base, capture: { index: -1 } })
        .success,
    ).toBe(false);
    expect(
      ScreenshotMetadataSchema.safeParse({ ...base, capture: { index: 1.5 } })
        .success,
    ).toBe(false);
  });

  it("accepts an SDK too old to record the capture index", () => {
    expect(ScreenshotMetadataSchema.safeParse(base).success).toBe(true);
  });
});
