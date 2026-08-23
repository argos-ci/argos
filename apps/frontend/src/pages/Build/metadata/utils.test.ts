import { describe, expect, it } from "vitest";

import { ScreenshotMetadataColorScheme } from "@/gql/graphql";

import {
  getUniqueBrowsers,
  getUniqueColorSchemes,
  getUniqueStoryModes,
  getUniqueViewports,
  type Metadata,
  type MetadataBrowser,
  type MetadataViewport,
} from "./utils";

/**
 * The switchers read their values off the sibling diffs, so the input order is
 * whatever the diff list hands over. Every case below feeds the values in the
 * wrong order on purpose: what is asserted is that the output does not depend
 * on it.
 */
function metadata(props: Partial<Metadata>): Metadata {
  return {
    __typename: "ScreenshotMetadata",
    url: null,
    previewUrl: null,
    colorScheme: null,
    mediaType: null,
    automationLibrary: {
      __typename: "ScreenshotMetadataAutomationLibrary",
      name: "playwright",
      version: "1.49.1",
    },
    browser: null,
    sdk: {
      __typename: "ScreenshotMetadataSDK",
      name: "@argos-ci/playwright",
      version: "2.0.0",
      latestVersion: null,
    },
    story: null,
    viewport: null,
    test: null,
    tags: null,
    ...props,
  };
}

function browser(name: string, version: string): MetadataBrowser {
  return { __typename: "ScreenshotMetadataBrowser", name, version };
}

function viewport(width: number, height: number): MetadataViewport {
  return { __typename: "ScreenshotMetadataViewport", width, height };
}

function story(mode: string): NonNullable<Metadata["story"]> {
  return {
    __typename: "ScreenshotMetadataStory",
    id: "gallery-hero--default",
    mode,
    play: false,
    tags: null,
  };
}

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
