import type { Metadata, MetadataBrowser, MetadataViewport } from "./utils";

/**
 * Metadata fixtures for the tests around the variant switchers. Everything the
 * SDK may leave out is null here, so a case states only the dimensions it is
 * about.
 */
export function metadata(props: Partial<Metadata>): Metadata {
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
    capture: null,
    viewport: null,
    test: null,
    tags: null,
    ...props,
  };
}

export function browser(name: string, version: string): MetadataBrowser {
  return { __typename: "ScreenshotMetadataBrowser", name, version };
}

export function viewport(width: number, height: number): MetadataViewport {
  return { __typename: "ScreenshotMetadataViewport", width, height };
}

export function story(mode: string): NonNullable<Metadata["story"]> {
  return {
    __typename: "ScreenshotMetadataStory",
    id: "gallery-hero--default",
    mode,
    play: false,
    tags: null,
  };
}
