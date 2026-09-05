import { atom, useAtomValue } from "jotai";
import { atomWithStorage } from "jotai/utils";

import { ScreenshotDiffStatus } from "@/gql/graphql";
import { checkIsImageContentType } from "@/util/content-type";

export type ViewMode = "split" | "baseline" | "changes" | "onion" | "swipe";

/** View modes blending baseline and changes into a single pane. */
export type BlendViewMode = Extract<ViewMode, "onion" | "swipe">;

export const buildViewModeAtom = atomWithStorage<ViewMode>(
  "preferences.diffViewMode",
  "split",
);

/**
 * Transient baseline override while the mobile dock's BASE button is held
 * down. Kept apart from `buildViewModeAtom` so releasing restores the stored
 * mode and the hold never persists.
 */
export const holdBaselineAtom = atom(false);

/** The view mode the snapshot panes should render, hold override included. */
export function useEffectiveBuildViewMode(): ViewMode {
  const viewMode = useAtomValue(buildViewModeAtom);
  const holdBaseline = useAtomValue(holdBaselineAtom);
  return holdBaseline ? "baseline" : viewMode;
}

/** Opacity of the changes layer in onion skin view (0 = baseline, 1 = changes). */
export const onionOpacityAtom = atom(0.5);

/** Horizontal position of the swipe divider, as a fraction of the image width. */
export const swipePositionAtom = atom(0.5);

/**
 * Vertical position of the swipe handle along the divider, as a fraction of the
 * image height. Only moves the handle, so it can be slid out of the way of the
 * area being compared.
 */
export const swipeHandleYAtom = atom(0.5);

export function checkIsBlendViewMode(
  viewMode: ViewMode,
): viewMode is BlendViewMode {
  return viewMode === "onion" || viewMode === "swipe";
}

/**
 * Whether baseline and changes can be blended into a single pane (onion skin
 * or swipe view): requires both screenshots to be images.
 */
export function checkDiffCanBeBlended(diff: {
  status: ScreenshotDiffStatus;
  baseScreenshot?: { contentType?: string | null } | null | undefined;
  compareScreenshot?: { contentType?: string | null } | null | undefined;
}): boolean {
  switch (diff.status) {
    case ScreenshotDiffStatus.Changed:
    case ScreenshotDiffStatus.Ignored:
      return Boolean(
        diff.baseScreenshot &&
        diff.compareScreenshot &&
        checkIsImageContentType(diff.baseScreenshot.contentType ?? "") &&
        checkIsImageContentType(diff.compareScreenshot.contentType ?? ""),
      );
    default:
      return false;
  }
}
