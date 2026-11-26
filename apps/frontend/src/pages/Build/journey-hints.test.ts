import { describe, expect, it } from "vitest";

import { getJourneyRunHints } from "./journey-hints";

describe("#getJourneyRunHints", () => {
  const run = (id: string, title: string, browser: string, width: number) => ({
    id,
    prefix: "a.spec.ts",
    title,
    variants: [{ browser, viewport: { width, height: 720 } }],
  });

  it("keeps what differs among the runs of one test", () => {
    const hints = getJourneyRunHints([
      run("chromium", "buy", "chromium", 1280),
      run("firefox", "buy", "firefox", 1280),
      run("mobile", "buy", "chromium", 375),
    ]);
    expect(hints.get("chromium")).toEqual({
      browser: "chromium",
      viewport: { width: 1280, height: 720 },
    });
    expect(hints.get("firefox")).toEqual({
      browser: "firefox",
      viewport: { width: 1280, height: 720 },
    });
  });

  it("gives no hint to a test run once", () => {
    const hints = getJourneyRunHints([
      run("chromium", "buy", "chromium", 1280),
      run("signup", "sign up", "firefox", 375),
    ]);
    expect(hints.get("chromium")).toEqual({ browser: null, viewport: null });
  });
});
