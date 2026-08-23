import { describe, expect, it } from "vitest";

import { ScreenshotMetadataColorScheme } from "@/gql/graphql";

import { browser, metadata, story, viewport } from "../testing";
import { countKeptAxes, getVariantPosition } from "./sibling";

const FIREFOX_1440 = metadata({
  browser: browser("firefox", "133.0"),
  viewport: viewport(1440, 900),
});

describe("countKeptAxes", () => {
  it("prefers the sibling that keeps the viewport when switching browser", () => {
    const keepsViewport = metadata({
      browser: browser("chromium", "131.0"),
      viewport: viewport(1440, 900),
    });
    const dropsViewport = metadata({
      browser: browser("chromium", "131.0"),
      viewport: viewport(375, 812),
    });
    expect(
      countKeptAxes(FIREFOX_1440, keepsViewport, "browser"),
    ).toBeGreaterThan(countKeptAxes(FIREFOX_1440, dropsViewport, "browser"));
  });

  it("prefers the sibling that keeps the browser when switching viewport", () => {
    const keepsBrowser = metadata({
      browser: browser("firefox", "133.0"),
      viewport: viewport(375, 812),
    });
    const dropsBrowser = metadata({
      browser: browser("chromium", "131.0"),
      viewport: viewport(375, 812),
    });
    expect(
      countKeptAxes(FIREFOX_1440, keepsBrowser, "viewport"),
    ).toBeGreaterThan(countKeptAxes(FIREFOX_1440, dropsBrowser, "viewport"));
  });

  it("ignores the dimension being switched", () => {
    const otherBrowser = metadata({
      browser: browser("chromium", "131.0"),
      viewport: viewport(1440, 900),
    });
    // Every other dimension is equal, so switching the browser keeps all of
    // them — the browser itself does not count against the move.
    expect(countKeptAxes(FIREFOX_1440, otherBrowser, "browser")).toBe(3);
  });

  it("counts every dimension, not only browser and viewport", () => {
    const from = metadata({
      browser: browser("firefox", "133.0"),
      colorScheme: ScreenshotMetadataColorScheme.Dark,
      story: story("compact"),
    });
    const keepsMode = metadata({
      browser: browser("firefox", "133.0"),
      colorScheme: ScreenshotMetadataColorScheme.Light,
      story: story("compact"),
    });
    const dropsMode = metadata({
      browser: browser("firefox", "133.0"),
      colorScheme: ScreenshotMetadataColorScheme.Light,
      story: story("wide"),
    });
    expect(countKeptAxes(from, keepsMode, "colorScheme")).toBeGreaterThan(
      countKeptAxes(from, dropsMode, "colorScheme"),
    );
  });

  it("treats a dimension the SDK left out as a value of its own", () => {
    const noViewport = metadata({ browser: browser("firefox", "133.0") });
    const withViewport = metadata({
      browser: browser("firefox", "133.0"),
      viewport: viewport(1440, 900),
    });
    expect(countKeptAxes(noViewport, noViewport, "browser")).toBe(3);
    expect(countKeptAxes(noViewport, withViewport, "browser")).toBe(2);
  });
});

describe("getVariantPosition", () => {
  it("reads light as the color scheme when none was reported", () => {
    expect(getVariantPosition(metadata({})).colorScheme).toBe(
      ScreenshotMetadataColorScheme.Light,
    );
  });

  it("says nothing about a snapshot with no metadata at all", () => {
    expect(getVariantPosition(null)).toEqual({
      browser: null,
      viewport: null,
      colorScheme: null,
      storyMode: null,
    });
  });
});
