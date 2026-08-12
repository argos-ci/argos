import { createLucideIcon } from "lucide-react";

/**
 * Original icons for concepts Lucide has no drawing for, built from Lucide's
 * own vocabulary (24px grid, 2px stroke, 2px corner radius) so they sit next
 * to Lucide icons without looking foreign. The design rules and recipes live
 * in the `lucide-style-icons` skill; the icons are documented in
 * `Icons.stories.tsx`.
 *
 * The comparison viewer's icons share one metaphor: a screenshot is a rounded
 * frame, and a comparison is two of them — the baseline on the left, the
 * changes on the right, the way the `←` / `→` keys reach for them.
 *
 * `SplitViewIcon`, `BaselineViewIcon` and `ChangesViewIcon` are the same two
 * panels every time; only the ink changes. Solid is the side on screen, dashed
 * is the side held back, so the three read as one control rather than three
 * drawings.
 */

/** The two panels the comparison icons are built from. */
const PANEL = { y: "5", width: "8", height: "14", rx: "2" } as const;
const LEFT_PANEL = { ...PANEL, x: "2" };
const RIGHT_PANEL = { ...PANEL, x: "14" };

/**
 * Ghosts a panel: the side that is not on screen. Coarse enough that the gaps
 * survive at the 16px the toolbar renders at — a finer dash closes up and the
 * icon becomes indistinguishable from the side-by-side one.
 */
const HELD_BACK = { strokeDasharray: "2 4" } as const;

/** The left panel solid, the right one ghosted: show the baseline alone. */
export const BaselineViewIcon = createLucideIcon("baseline-view", [
  ["rect", { ...LEFT_PANEL, key: "shown" }],
  ["rect", { ...RIGHT_PANEL, ...HELD_BACK, key: "held-back" }],
]);

/** The right panel solid, the left one ghosted: show the changes alone. */
export const ChangesViewIcon = createLucideIcon("changes-view", [
  ["rect", { ...LEFT_PANEL, ...HELD_BACK, key: "held-back" }],
  ["rect", { ...RIGHT_PANEL, key: "shown" }],
]);

/**
 * Both frames full, blended into each other: the onion view lays the changes
 * over the baseline with an opacity slider. Same statement as Lucide's
 * `blend`, made with our frames instead of circles.
 */
export const OnionViewIcon = createLucideIcon("onion-view", [
  ["rect", { x: "3", y: "3", width: "12", height: "12", rx: "2", key: "back" }],
  [
    "rect",
    { x: "9", y: "9", width: "12", height: "12", rx: "2", key: "front" },
  ],
]);

/**
 * One frame cut by a divider with a round drag handle: the swipe view scrubs
 * a divider across the image to reveal one layer over the other. The frame
 * halves are Lucide's `square-split-horizontal`; the handle on the line is
 * `git-commit-vertical`.
 */
export const SwipeViewIcon = createLucideIcon("swipe-view", [
  ["path", { d: "M8 19H5c-1 0-2-1-2-2V7c0-1 1-2 2-2h3", key: "left" }],
  ["path", { d: "M16 5h3c1 0 2 1 2 2v10c0 1-1 2-2 2h-3", key: "right" }],
  ["path", { d: "M12 3v6", key: "divider-top" }],
  ["path", { d: "M12 15v6", key: "divider-bottom" }],
  ["circle", { cx: "12", cy: "12", r: "3", key: "handle" }],
]);

/**
 * Both panels solid: the split view shows baseline and changes as two separate
 * panes, not one image divided (which is the swipe).
 */
export const SplitViewIcon = createLucideIcon("split-view", [
  ["rect", { ...LEFT_PANEL, key: "left" }],
  ["rect", { ...RIGHT_PANEL, key: "right" }],
]);
