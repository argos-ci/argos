import { describe, expect, it } from "vitest";

import { getScreenVariant } from "./variants";

describe("getScreenVariant", () => {
  it("reads the dimensions off the metadata", () => {
    expect(
      getScreenVariant({
        metadata: {
          viewport: { width: 414 },
          browser: { name: "chromium" },
          colorScheme: "dark",
        },
      }),
    ).toEqual({ viewport: "414", browser: "chromium", theme: "dark" });
  });

  it("leaves a dimension null when the metadata says nothing", () => {
    // Older uploads carry no viewport, and a screen must not disappear from a
    // journey because Argos does not know how wide it was.
    expect(
      getScreenVariant({ metadata: { browser: { name: "firefox" } } }),
    ).toEqual({ viewport: null, browser: "firefox", theme: null });
    expect(getScreenVariant({})).toEqual({
      viewport: null,
      browser: null,
      theme: null,
    });
  });
});
