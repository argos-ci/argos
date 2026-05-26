import { generatePath, useMatch } from "react-router-dom";

import {
  ScreenshotDiffStatus,
  ScreenshotMetadataColorScheme,
} from "@/gql/graphql";
import { canParseURL } from "@/util/url";

import type { Diff } from "../../BuildDiffState";

export type Metadata = NonNullable<
  NonNullable<Diff["baseScreenshot"]>["metadata"]
>;
export type MetadataBrowser = NonNullable<Metadata["browser"]>;
export type MetadataViewport = NonNullable<Metadata["viewport"]>;
export type AutomationLibrary = NonNullable<Metadata["automationLibrary"]>;

export function resolveDiffMetadata(diff: Diff): Metadata | null {
  return (
    (diff.status === ScreenshotDiffStatus.Removed
      ? diff.baseScreenshot?.metadata
      : diff.compareScreenshot?.metadata) ?? null
  );
}

export function resolveColorScheme(
  metadata: Metadata | null,
): ScreenshotMetadataColorScheme {
  return metadata?.colorScheme ?? ScreenshotMetadataColorScheme.Light;
}

export function hashViewport(viewport: MetadataViewport): string {
  return `${viewport.width}x${viewport.height}`;
}

export function hashBrowser(browser: MetadataBrowser): string {
  return `${browser.name} ${browser.version}`.toLowerCase();
}

export function getUniqueViewports(
  metadataList: Metadata[],
): MetadataViewport[] {
  const hashes = new Set<string>();
  const viewports = metadataList.reduce<MetadataViewport[]>(
    (viewports, metadata) => {
      if (!metadata.viewport) {
        return viewports;
      }
      const hash = hashViewport(metadata.viewport);
      if (hashes.has(hash)) {
        return viewports;
      }
      hashes.add(hash);
      viewports.push(metadata.viewport);
      return viewports;
    },
    [],
  );
  return viewports.sort((a, b) => a.width - b.width);
}

export function getUniqueBrowsers(metadataList: Metadata[]): MetadataBrowser[] {
  const hashes = new Set<string>();
  return metadataList.reduce<MetadataBrowser[]>((browsers, metadata) => {
    if (!metadata.browser) {
      return browsers;
    }
    const hash = hashBrowser(metadata.browser);
    if (hashes.has(hash)) {
      return browsers;
    }
    hashes.add(hash);
    browsers.push(metadata.browser);
    return browsers;
  }, []);
}

export function getUniqueColorSchemes(
  metadataList: Metadata[],
): ScreenshotMetadataColorScheme[] {
  return Array.from(new Set(metadataList.map(resolveColorScheme)));
}

export function getUniqueStoryModes(metadataList: Metadata[]): string[] {
  const modes = new Set<string>();
  for (const metadata of metadataList) {
    if (metadata.story?.mode) {
      modes.add(metadata.story.mode);
    }
  }
  return Array.from(modes).sort();
}

export function useGetDiffPath() {
  const path = "/:accountSlug/:projectName/builds/:buildNumber/:diffId";
  const match = useMatch(path);
  return (diffId: string) => {
    if (!match) {
      return null;
    }
    const { accountSlug, projectName, buildNumber } = match.params;
    if (!accountSlug || !projectName || !buildNumber) {
      return null;
    }
    return generatePath(path, {
      accountSlug,
      projectName,
      buildNumber,
      diffId,
    });
  };
}

export function resolvePreviewUrlFromDeployment(input: {
  url: string | null;
  deploymentUrl: string | null;
}) {
  const { url, deploymentUrl } = input;
  if (
    !url ||
    !deploymentUrl ||
    !canParseURL(url) ||
    !canParseURL(deploymentUrl)
  ) {
    return null;
  }
  const urlObj = new URL(url);
  const result = new URL(deploymentUrl);
  result.pathname = urlObj.pathname;
  result.search = urlObj.search;
  return result.toString();
}
