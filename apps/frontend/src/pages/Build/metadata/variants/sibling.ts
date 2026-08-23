import type { Diff } from "../../BuildDiffState";
import {
  hashBrowser,
  hashViewport,
  resolveColorScheme,
  resolveDiffMetadata,
  type Metadata,
} from "../utils";

/** A dimension a snapshot's siblings can differ along. */
export type VariantAxis = "browser" | "viewport" | "colorScheme" | "storyMode";

const AXES: VariantAxis[] = ["browser", "viewport", "colorScheme", "storyMode"];

/**
 * Where a snapshot sits along every dimension at once, as comparable strings.
 * `null` where the SDK reported nothing — which is a value like any other here:
 * two snapshots that both say nothing about their viewport are on the same
 * footing.
 */
export function getVariantPosition(
  metadata: Metadata | null,
): Record<VariantAxis, string | null> {
  return {
    browser: metadata?.browser ? hashBrowser(metadata.browser) : null,
    viewport: metadata?.viewport ? hashViewport(metadata.viewport) : null,
    colorScheme: metadata ? resolveColorScheme(metadata) : null,
    storyMode: metadata?.story?.mode ?? null,
  };
}

/**
 * How much of `from` a move to `candidate` would keep, counting every dimension
 * but the one being switched.
 */
export function countKeptAxes(
  from: Metadata | null,
  candidate: Metadata | null,
  axis: VariantAxis,
): number {
  const a = getVariantPosition(from);
  const b = getVariantPosition(candidate);
  return AXES.filter((key) => key !== axis && a[key] === b[key]).length;
}

/**
 * The sibling to land on when switching `axis` to `value`.
 *
 * Not simply the first sibling carrying that value: with two dimensions in play
 * that is whichever the diff list happens to hold first, so switching the
 * browser from Firefox at 1440 could quietly drop the viewport back to 375.
 * Among the siblings that carry the value, this takes the one that keeps most
 * of where the reviewer already was, so a move along one dimension is only ever
 * a move along that one.
 *
 * Best effort by design: nothing guarantees the matrix is full — Firefox may
 * only have been captured at 375 — and a switcher that led nowhere would be
 * worse than one that lands on the nearest thing. Ties go to the earlier
 * sibling, which is the order the switchers themselves are built in.
 */
export function findVariantSibling(input: {
  diff: Diff;
  siblingDiffs: Diff[];
  axis: VariantAxis;
  value: string;
}): Diff | undefined {
  const { diff, siblingDiffs, axis, value } = input;
  const from = resolveDiffMetadata(diff);
  let best: Diff | undefined;
  let bestKept = -1;
  for (const sibling of siblingDiffs) {
    const metadata = resolveDiffMetadata(sibling);
    if (getVariantPosition(metadata)[axis] !== value) {
      continue;
    }
    const kept = countKeptAxes(from, metadata, axis);
    if (kept > bestKept) {
      best = sibling;
      bestKept = kept;
    }
  }
  return best;
}
