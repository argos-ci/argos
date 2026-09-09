import { describe, expect, it } from "vitest";

import { ScreenshotMetadataColorScheme } from "@/gql/graphql";

import { browser, metadata, story, viewport } from "./testing";
import {
  getUniqueBrowsers,
  getUniqueColorSchemes,
  getUniqueStoryModes,
  getUniqueViewports,
  storyModeRestatesColorScheme,
} from "./utils";

/**
 * The switchers read their values off the sibling diffs, so the input order is
 * whatever the diff list hands over. Every case below feeds the values in the
 * wrong order on purpose: what is asserted is that the output does not depend
 * on it.
 */

describe("getUniqueBrowsers", () => {
  it("orders by label, then by version", () => {
    const browsers = getUniqueBrowsers([
      metadata({ browser: browser("webkit", "18.2") }),
      metadata({ browser: browser("chromium", "131.0") }),
      metadata({ browser: browser("firefox", "133.0") }),
      metadata({ browser: browser("chromium", "99.0") }),
    ]);
    expect(
      browsers.map((browser) => `${browser.name} ${browser.version}`),
    ).toEqual([
      // Numerically: a plain string compare would put "131.0" first.
      "chromium 99.0",
      "chromium 131.0",
      "firefox 133.0",
      "webkit 18.2",
    ]);
  });

  it("keeps one entry per name and version", () => {
    const browsers = getUniqueBrowsers([
      metadata({ browser: browser("chromium", "131.0") }),
      metadata({ browser: browser("Chromium", "131.0") }),
      metadata({}),
    ]);
    expect(browsers).toHaveLength(1);
  });
});

describe("getUniqueViewports", () => {
  it("orders by width, then by height", () => {
    const viewports = getUniqueViewports([
      metadata({ viewport: viewport(375, 1440) }),
      metadata({ viewport: viewport(1280, 800) }),
      metadata({ viewport: viewport(375, 720) }),
    ]);
    expect(viewports).toEqual([
      viewport(375, 720),
      viewport(375, 1440),
      viewport(1280, 800),
    ]);
  });
});

describe("getUniqueColorSchemes", () => {
  it("orders dark before light, whichever comes first", () => {
    const schemes = getUniqueColorSchemes([
      metadata({ colorScheme: ScreenshotMetadataColorScheme.Light }),
      metadata({ colorScheme: ScreenshotMetadataColorScheme.Dark }),
    ]);
    expect(schemes).toEqual([
      ScreenshotMetadataColorScheme.Dark,
      ScreenshotMetadataColorScheme.Light,
    ]);
  });

  it("counts a missing color scheme as light", () => {
    expect(getUniqueColorSchemes([metadata({})])).toEqual([
      ScreenshotMetadataColorScheme.Light,
    ]);
  });
});

describe("getUniqueStoryModes", () => {
  it("orders alphabetically", () => {
    const modes = getUniqueStoryModes([
      metadata({ story: story("wide") }),
      metadata({ story: story("compact") }),
    ]);
    expect(modes).toEqual(["compact", "wide"]);
  });
});

describe("storyModeRestatesColorScheme", () => {
  const dark = ScreenshotMetadataColorScheme.Dark;
  const light = ScreenshotMetadataColorScheme.Light;

  it("is true when every mode names the scheme it goes with", () => {
    expect(
      storyModeRestatesColorScheme([
        metadata({ story: story("dark"), colorScheme: dark }),
        metadata({ story: story("light"), colorScheme: light }),
      ]),
    ).toBe(true);
  });

  it("reads the mode case-insensitively", () => {
    expect(
      storyModeRestatesColorScheme([
        metadata({ story: story("Dark"), colorScheme: dark }),
        metadata({ story: story("LIGHT"), colorScheme: light }),
      ]),
    ).toBe(true);
  });

  // Light is what a snapshot saying nothing resolves to, so a `light` mode
  // restates it even where the SDK reported no scheme at all.
  it("counts the scheme a snapshot leaves unset as light", () => {
    expect(
      storyModeRestatesColorScheme([
        metadata({ story: story("light") }),
        metadata({ story: story("dark"), colorScheme: dark }),
      ]),
    ).toBe(true);
  });

  it("is false when a mode is named anything else", () => {
    expect(
      storyModeRestatesColorScheme([
        metadata({ story: story("mobile"), colorScheme: light }),
        metadata({ story: story("desktop"), colorScheme: dark }),
      ]),
    ).toBe(false);
  });

  // The one the naming rule buys over a structural test: these two cut the
  // snapshots up exactly as the scheme does, and still say something else.
  it("is false for names that merely line up one-to-one with the schemes", () => {
    expect(
      storyModeRestatesColorScheme([
        metadata({ story: story("night"), colorScheme: dark }),
        metadata({ story: story("day"), colorScheme: light }),
      ]),
    ).toBe(false);
  });

  it("is false when a mode names the scheme the snapshot does not have", () => {
    expect(
      storyModeRestatesColorScheme([
        metadata({ story: story("dark"), colorScheme: light }),
        metadata({ story: story("light"), colorScheme: light }),
      ]),
    ).toBe(false);
  });

  it("is false when no snapshot carries a mode", () => {
    expect(
      storyModeRestatesColorScheme([
        metadata({ colorScheme: dark }),
        metadata({ colorScheme: light }),
      ]),
    ).toBe(false);
  });
});
