import {
  pickVariantByDims,
  type Journey,
  type VariantDims,
  type VariantSelection,
} from "@/util/flow-model";

/**
 * How a step of the journey reads in the build: the same as the baseline,
 * changed (it has both images and they differ), new (no baseline), or gone
 * (no screenshot in the build).
 */
export type StoryboardKind = "unchanged" | "changed" | "added" | "removed";

export type StoryboardRow<T> = {
  /** The step key (`variantKey`). */
  key: string;
  label: string;
  /** 1-based position in the journey. */
  position: number;
  /** The variant of the step shown in the lane. */
  diff: T;
  kind: StoryboardKind;
  /** Folded to a thumbnail because only changes are wanted. */
  collapsed: boolean;
};

/** What the storyboard needs to know about a diff. */
export type StoryboardDiff = {
  /** Whether the build has a screenshot for this step. */
  hasCompare: boolean;
  /** Whether the baseline has one. */
  hasBase: boolean;
  unchanged: boolean;
  dims: VariantDims;
};

function getStoryboardKind(diff: StoryboardDiff): StoryboardKind {
  if (!diff.hasCompare) {
    return "removed";
  }
  if (!diff.hasBase) {
    return "added";
  }
  return diff.unchanged ? "unchanged" : "changed";
}

/**
 * Lays a journey out for one build: one row per step, showing the variant
 * closest to the selection, with what happened to it. With `onlyChanges`,
 * unchanged steps fold to thumbnails so the changes sit next to each other.
 */
export function buildStoryboard<T>(
  journey: Journey<T>,
  describe: (diff: T) => StoryboardDiff,
  selection: VariantSelection,
  options: { onlyChanges: boolean },
): StoryboardRow<T>[] {
  const rows: StoryboardRow<T>[] = [];
  journey.steps.forEach((step, index) => {
    const diff = pickVariantByDims(
      step.diffs,
      (candidate) => describe(candidate).dims,
      selection,
    );
    if (!diff) {
      return;
    }
    const kind = getStoryboardKind(describe(diff));
    rows.push({
      key: step.key,
      label: step.label,
      position: index + 1,
      diff,
      kind,
      collapsed: options.onlyChanges && kind === "unchanged",
    });
  });
  return rows;
}

export function countChanges(rows: StoryboardRow<unknown>[]): number {
  return rows.filter((row) => row.kind !== "unchanged").length;
}
