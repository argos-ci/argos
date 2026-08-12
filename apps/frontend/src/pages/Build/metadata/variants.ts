import { ScreenshotMetadataColorScheme } from "@/gql/graphql";

import type { Diff } from "../BuildDiffState";
import {
  resolveColorScheme,
  resolveDiffMetadata,
} from "../sidebar/metadata/utils";
import { getBrowserLabel } from "./browser/browserLabels";

/**
 * Strips a trailing color-scheme marker from a variant key, so both captures of
 * one page land on the same key.
 */
function getSchemeFreeKey(variantKey: string): string {
  return variantKey.replace(/-(dark|light)$/i, "");
}

/**
 * Every capture of the same snapshot: the siblings Argos already groups under one
 * variant key — the browsers and viewports it ran on — plus the color-scheme
 * twin.
 *
 * The scheme is the one axis Argos does not model as a variant: a suite capturing
 * a page in both schemes usually names the two captures differently (`homepage`
 * and `homepage-dark`), which makes them two snapshots rather than two variants
 * of one. So the twin is matched on two signals that have to agree: a name
 * differing only by a scheme marker, and metadata confirming the scheme really
 * flipped. Either alone would pair a genuinely dark-themed `homepage-dark` page
 * with `homepage`; together they don't.
 */
export function getVariantFamily(activeDiff: Diff, allDiffs: Diff[]): Diff[] {
  const activeScheme = resolveColorScheme(resolveDiffMetadata(activeDiff));
  const schemeFreeKey = getSchemeFreeKey(activeDiff.variantKey);

  return allDiffs
    .filter((diff) => {
      if (diff.variantKey === activeDiff.variantKey) {
        return true;
      }
      return (
        getSchemeFreeKey(diff.variantKey) === schemeFreeKey &&
        resolveColorScheme(resolveDiffMetadata(diff)) !== activeScheme
      );
    })
    .sort(compareVariants);
}

/** Browser, then viewport, then scheme: the order the labels read in. */
function compareVariants(a: Diff, b: Diff): number {
  const aMeta = resolveDiffMetadata(a);
  const bMeta = resolveDiffMetadata(b);
  const byBrowser = (aMeta?.browser?.name ?? "").localeCompare(
    bMeta?.browser?.name ?? "",
  );
  if (byBrowser !== 0) {
    return byBrowser;
  }
  const byWidth = (aMeta?.viewport?.width ?? 0) - (bMeta?.viewport?.width ?? 0);
  if (byWidth !== 0) {
    return byWidth;
  }
  return resolveColorScheme(aMeta).localeCompare(resolveColorScheme(bMeta));
}

/**
 * What tells one capture of a snapshot from another, spelled out — full viewport
 * and the scheme when it is the dark one, which the filter bar has to abbreviate
 * for want of room.
 */
export function getVariantLabel(diff: Diff): string {
  const metadata = resolveDiffMetadata(diff);
  const parts: string[] = [];
  if (metadata?.browser) {
    parts.push(getBrowserLabel(metadata.browser.name));
  }
  if (metadata?.viewport) {
    parts.push(`${metadata.viewport.width}×${metadata.viewport.height}px`);
  }
  if (resolveColorScheme(metadata) === ScreenshotMetadataColorScheme.Dark) {
    parts.push("Dark");
  }
  return parts.join(" · ") || diff.name;
}
