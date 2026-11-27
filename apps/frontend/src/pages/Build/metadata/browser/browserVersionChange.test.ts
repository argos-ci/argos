import { describe, expect, it } from "vitest";

import { getBrowserVersionChanges } from "./browserVersionChange";

type Browser = [name: string, version: string] | "no-metadata" | null;

function screenshot(browser: Browser) {
  if (browser === null) {
    return null;
  }
  if (browser === "no-metadata") {
    return { metadata: null };
  }
  const [name, version] = browser;
  return { metadata: { browser: { name, version } } };
}

function diff(base: Browser, compare: Browser) {
  return {
    baseScreenshot: screenshot(base),
    compareScreenshot: screenshot(compare),
  };
}

describe("getBrowserVersionChanges", () => {
  it("lists each browser whose version differs from the baseline once", () => {
    expect(
      getBrowserVersionChanges([
        diff(["firefox", "141.0"], ["firefox", "142.0.1"]),
        diff(["chromium", "140.0.7339.16"], ["chromium", "141.0.7390.37"]),
        diff(["chromium", "140.0.7339.16"], ["chromium", "141.0.7390.37"]),
        diff(["webkit", "26.0"], ["webkit", "26.0"]),
        // Another browser, not another version.
        diff(["webkit", "26.0"], ["chromium", "141.0.7390.37"]),
        diff("no-metadata", ["chromium", "141.0.7390.37"]),
        // Added and removed snapshots have only one side.
        diff(null, ["chromium", "141.0.7390.37"]),
        diff(["chromium", "139.0.7258.5"], null),
      ]),
    ).toEqual([
      {
        name: "chromium",
        baseVersion: "140.0.7339.16",
        compareVersion: "141.0.7390.37",
      },
      { name: "firefox", baseVersion: "141.0", compareVersion: "142.0.1" },
    ]);
  });

  it("orders versions numerically", () => {
    expect(
      getBrowserVersionChanges([
        diff(["chromium", "100.0"], ["chromium", "141.0"]),
        diff(["chromium", "99.0"], ["chromium", "141.0"]),
      ]).map((change) => change.baseVersion),
    ).toEqual(["99.0", "100.0"]);
  });
});
