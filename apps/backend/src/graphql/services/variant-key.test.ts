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

  it("handles variant keys with modes", async () => {
    expect(getVariantKey("role/edit/space-ui mode-[big test].png")).toBe(
      "role/edit/space-ui",
    );
    expect(getVariantKey("space-ui mode-[another_test].png")).toBe("space-ui");
    expect(getVariantKey("another/path mode-[wtf].png")).toBe("another/path");
  });
});
