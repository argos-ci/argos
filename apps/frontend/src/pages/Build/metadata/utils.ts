import { use } from "react";
import { invariant } from "@argos/util/invariant";

import {
  ScreenshotDiffStatus,
  ScreenshotMetadataColorScheme,
} from "@/gql/graphql";
import { canParseURL } from "@/util/url";

import type { Diff } from "../BuildDiffState";
import { getBuildURL, useBuildParams } from "../BuildParams";
import { getBrowserLabel } from "./browser/browserLabels";
import { FilterStateContext } from "./filters/FilterState";
import { followVariantFilter, withFilters } from "./filters/util";
import type { VariantAxis } from "./variants/sibling";

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

/**
 * The `getUnique*` lists below feed the variant switchers, and each is sorted on
 * a total order rather than left in the order the siblings arrive in — that one
 * comes from the diff list, so an unsorted row would deal its chips differently
 * from one snapshot to the next. Ordered like the filter menu, which lists the
 * same values.
 */
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
  return viewports.sort((a, b) => a.width - b.width || a.height - b.height);
}

export function getUniqueBrowsers(metadataList: Metadata[]): MetadataBrowser[] {
  const hashes = new Set<string>();
  const browsers = metadataList.reduce<MetadataBrowser[]>(
    (browsers, metadata) => {
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
    },
    [],
  );
  return browsers.sort(
    (a, b) =>
      // By label, not by name: the label is what the chip shows, and the two
      // disagree for WebKit.
      getBrowserLabel(a.name).localeCompare(getBrowserLabel(b.name)) ||
      a.version.localeCompare(b.version, undefined, { numeric: true }),
  );
}

export function getUniqueColorSchemes(
  metadataList: Metadata[],
): ScreenshotMetadataColorScheme[] {
  return Array.from(new Set(metadataList.map(resolveColorScheme))).sort();
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

/**
 * Links a variant switcher to `sibling`, with the filters of the list on, or
 * `filters`. A filter along the switcher's axis follows the switch, so the
 * sibling stays in the list.
 */
export function useGetDiffPath(axis: VariantAxis) {
  const params = useBuildParams();
  invariant(params, "a variant switcher is on a build page");
  const filterState = use(FilterStateContext);
  invariant(filterState, "a variant switcher is in a filter context");
  return (sibling: Diff, filters: ReadonlySet<string> = filterState.active) =>
    withFilters(
      getBuildURL({ ...params, diffId: sibling.id }),
      followVariantFilter(filters, sibling, axis),
    );
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
