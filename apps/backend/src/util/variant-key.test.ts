import { describe, expect, it } from "vitest";

import { getVariantKey } from "./variant-key";

describe("#getVariantKey", () => {
  it("returns the variant key", async () => {
    expect(getVariantKey("chromium/role/edit/space-ui vw-375.png")).toBe(
      "role/edit/space-ui",
    );
    expect(getVariantKey("firefox/space-ui vw-375.png")).toBe("space-ui");
    expect(getVariantKey("safari/another/path vw-480.png")).toBe(
      "another/path",
    );
    expect(getVariantKey("chrome/role/edit/space-ui vw-720.png")).toBe(
      "role/edit/space-ui",
    );
    expect(getVariantKey("chrome/role/edit/space-ui.png")).toBe(
      "role/edit/space-ui",
    );
  });

  it("handles failed variant keys", async () => {
    expect(getVariantKey("chromium/role/edit/space-ui #123 (failed).png")).toBe(
      "role/edit/space-ui",
    );
    expect(getVariantKey("firefox/space-ui #456 (failed).png")).toBe(
      "space-ui",
    );
    expect(getVariantKey("safari/another/path #789 (failed).png")).toBe(
      "another/path",
    );
    expect(getVariantKey("chrome/role/edit/space-ui #101 (failed).png")).toBe(
      "role/edit/space-ui",
    );
  });

  it("handles variant keys without browser prefix", async () => {
    expect(getVariantKey("role/edit/space-ui vw-375.png")).toBe(
      "role/edit/space-ui",
    );
    expect(getVariantKey("space-ui vw-375.png")).toBe("space-ui");
    expect(getVariantKey("another/path vw-480.png")).toBe("another/path");
    expect(getVariantKey("role/edit/space-ui vw-720.png")).toBe(
      "role/edit/space-ui",
    );
    expect(getVariantKey("role/edit/space-ui.png")).toBe("role/edit/space-ui");
  });

  it("handles variant keys without vw suffix", async () => {
    expect(getVariantKey("chromium/role/edit/space-ui.png")).toBe(
      "role/edit/space-ui",
    );
    expect(getVariantKey("firefox/space-ui.png")).toBe("space-ui");
    expect(getVariantKey("safari/another/path.png")).toBe("another/path");
    expect(getVariantKey("chrome/role/edit/space-ui.png")).toBe(
      "role/edit/space-ui",
    );
  });

  it("handles repeated tests", async () => {
    expect(getVariantKey("chromium/space-ui repeat-2.png")).toBe("space-ui");
    expect(getVariantKey("space-ui repeat-1.png")).toBe("space-ui");
    expect(getVariantKey("role/edit/space-ui repeat-10.png")).toBe(
      "role/edit/space-ui",
    );
    // `repeatEach` appends its suffix after the viewport one.
    expect(getVariantKey("chromium/space-ui vw-375 repeat-2.png")).toBe(
      "space-ui",
    );
    expect(getVariantKey("space-ui mode-[dark] repeat-2.png")).toBe("space-ui");
    // ARIA snapshots don't use the `.png` extension.
    expect(getVariantKey("chromium/space-ui repeat-2.aria.yml")).toBe(
      "space-ui.aria.yml",
    );
    // A repeated snapshot groups with its non-repeated sibling.
    expect(getVariantKey("chromium/space-ui repeat-2.png")).toBe(
      getVariantKey("chromium/space-ui.png"),
    );
  });

  it("does not strip a repeat-like segment in the middle of a name", async () => {
    expect(getVariantKey("chromium/space-ui repeat-2 detail.png")).toBe(
      "space-ui repeat-2 detail",
    );
  });

  it("handles variant keys with modes", async () => {
    expect(getVariantKey("role/edit/space-ui mode-[big test].png")).toBe(
      "role/edit/space-ui",
    );
    expect(getVariantKey("space-ui mode-[another_test].png")).toBe("space-ui");
    expect(getVariantKey("another/path mode-[wtf].png")).toBe("another/path");
  });
});
