import { describe, expect, it } from "vitest";

import { getJourneyRunHints, getWalkAfterSwitch } from "./journey-hints";

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

describe("#getWalkAfterSwitch", () => {
  const journey = (id: string, ...variants: string[][]) => ({
    id,
    variants: variants.map((diffIds) => ({ diffIds })),
  });
  // A test taking each screen at two sizes, and the same test run in Firefox.
  const search = journey("search", ["s-375-1", "s-375-2"], ["s-1280-1"]);
  const chromium = journey("chromium", ["c-1", "c-2"]);
  const firefox = journey("firefox", ["f-1", "f-2"]);
  const journeys = [search, chromium, firefox];

  it("walks nothing outside of a walk", () => {
    expect(
      getWalkAfterSwitch({
        journeys,
        walked: [],
        fromDiffId: "c-1",
        toDiffId: "f-1",
      }),
    ).toBeNull();
  });

  it("keeps the walk on a sibling of the same journey", () => {
    expect(
      getWalkAfterSwitch({
        journeys,
        walked: [search],
        fromDiffId: "s-375-1",
        toDiffId: "s-1280-1",
      }),
    ).toEqual(new Set(["search"]));
  });

  it("walks the run the sibling belongs to, keeping the other journeys", () => {
    expect(
      getWalkAfterSwitch({
        journeys,
        walked: [search, chromium],
        fromDiffId: "c-2",
        toDiffId: "f-2",
      }),
    ).toEqual(new Set(["search", "firefox"]));
  });

  it("leaves the walk for a sibling of no journey", () => {
    expect(
      getWalkAfterSwitch({
        journeys,
        walked: [chromium],
        fromDiffId: "c-1",
        toDiffId: "other",
      }),
    ).toBeNull();
  });
});
