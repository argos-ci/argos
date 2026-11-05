import { createLucideIcon, type IconNode } from "lucide-react";

import { EYE, FRAME_RADIUS, GHOST, PUPIL, TINT } from "./language";

/*
 * The comparison viewer's toolbar and menus: how a screenshot is looked at.
 * This is where the eye lives.
 */

/** The logo's eye, open: show the overlay of what changed. */
export const EyeIcon = createLucideIcon("eye", [
  ["path", { d: EYE, ...TINT, key: "eye" }],
  ["circle", { ...PUPIL, key: "pupil" }],
]);

/**
 * The same eye, closed: nothing to look at. Closing it keeps the almond's
 * silhouette, which a dashed outline would lose at 16px.
 */
export const EyeOffIcon = createLucideIcon("eye-off", [
  ["path", { d: "M2 8c2.7 4 6 6 10 6s7.3-2 10-6", key: "lid" }],
  ["path", { d: "m6.5 12.5-1.5 2.5", key: "lash-left" }],
  ["path", { d: "M12 14v3", key: "lash-middle" }],
  ["path", { d: "m17.5 12.5 1.5 2.5", key: "lash-right" }],
]);

const SCAN_CORNERS: IconNode = [
  ["path", { d: "M3 7V6a3 3 0 0 1 3-3h1", key: "top-left" }],
  ["path", { d: "M17 3h1a3 3 0 0 1 3 3v1", key: "top-right" }],
  ["path", { d: "M21 17v1a3 3 0 0 1-3 3h-1", key: "bottom-right" }],
  ["path", { d: "M7 21H6a3 3 0 0 1-3-3v-1", key: "bottom-left" }],
];

/** The eye in a viewfinder: what is left to look at. */
export const ScanEyeIcon = createLucideIcon("scan-eye", [
  ...SCAN_CORNERS,
  [
    "path",
    {
      d: "M5 12c1.8-3 4.2-5 7-5s5.2 2 7 5c-1.8 3-4.2 5-7 5s-5.2-2-7-5z",
      ...TINT,
      key: "eye",
    },
  ],
  ["circle", { cx: "12", cy: "12", r: "1", key: "pupil" }],
]);

/** Lines of text in a viewfinder: the accessibility tree, read as text. */
export const ScanTextIcon = createLucideIcon("scan-text", [
  ...SCAN_CORNERS,
  ["path", { d: "M7 8h8", key: "line-1" }],
  ["path", { d: "M7 12h10", key: "line-2" }],
  ["path", { d: "M7 16h6", key: "line-3" }],
]);

/** The crosshair locks onto a change; its pupil is the change. */
export const LocateFixedIcon = createLucideIcon("locate-fixed", [
  ["path", { d: "M2 12h3", key: "left" }],
  ["path", { d: "M19 12h3", key: "right" }],
  ["path", { d: "M12 2v3", key: "top" }],
  ["path", { d: "M12 19v3", key: "bottom" }],
  ["circle", { cx: "12", cy: "12", r: "7", ...TINT, key: "ring" }],
  ["circle", { ...PUPIL, key: "pupil" }],
]);

/** Pan the screenshot. A tool, not a subject: bare ink. */
export const HandIcon = createLucideIcon("hand", [
  ["path", { d: "M18 11V6a2 2 0 0 0-4 0", key: "ring-finger" }],
  ["path", { d: "M14 10V4a2 2 0 0 0-4 0v2", key: "middle-finger" }],
  ["path", { d: "M10 10.5V6a2 2 0 0 0-4 0v8", key: "index-finger" }],
  [
    "path",
    {
      d: "M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15",
      key: "palm",
    },
  ],
]);

/**
 * A wall brush, bristles up: how the viewer paints the screenshot (its
 * background, its diff color). The bristles carry the wash.
 */
export const PaintbrushIcon = createLucideIcon("paintbrush", [
  [
    "path",
    { d: "M6 12V5a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v7z", ...TINT, key: "bristles" },
  ],
  ["path", { d: "M10 2v3", key: "stroke-left" }],
  ["path", { d: "M14 2v5", key: "stroke-right" }],
  [
    "path",
    {
      d: "M6 12v2a2 2 0 0 0 2 2h2v3a2 2 0 0 0 4 0v-3h2a2 2 0 0 0 2-2v-2",
      key: "handle",
    },
  ],
]);

/** The copy in front carries the wash; the original peeks out behind. */
export const CopyIcon = createLucideIcon("copy", [
  [
    "rect",
    {
      x: "8",
      y: "8",
      width: "14",
      height: "14",
      rx: FRAME_RADIUS,
      ...TINT,
      key: "front",
    },
  ],
  [
    "path",
    { d: "M5 16a3 3 0 0 1-3-3V5a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3", key: "back" },
  ],
]);

export const DownloadIcon = createLucideIcon("download", [
  ["path", { d: "M12 15V3", key: "shaft" }],
  ["path", { d: "m7 10 5 5 5-5", key: "head" }],
  ["path", { d: "M21 15v3a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-3", key: "tray" }],
]);

/**
 * Two washes that overlap and darken where they meet: the diff mask, where
 * baseline and changes disagree.
 */
export const BlendIcon = createLucideIcon("blend", [
  ["circle", { cx: "15", cy: "9", r: "7", ...TINT, key: "changes" }],
  ["circle", { cx: "9", cy: "15", r: "7", ...TINT, key: "baseline" }],
]);

/** The diff laid on the screenshot: the top layer is the washed one. */
export const Layers2Icon = createLucideIcon("layers-2", [
  [
    "path",
    {
      d: "M13 13.74a2 2 0 0 1-2 0L2.5 8.87a1 1 0 0 1 0-1.74L11 2.26a2 2 0 0 1 2 0l8.5 4.87a1 1 0 0 1 0 1.74z",
      ...TINT,
      key: "top",
    },
  ],
  [
    "path",
    {
      d: "m20 14.29 1.5.84a1 1 0 0 1 0 1.74L13 21.74a2 2 0 0 1-2 0l-8.5-4.87a1 1 0 0 1 0-1.74l1.5-.84",
      key: "bottom",
    },
  ],
]);

/*
 * The view modes are one control in five states, so they are one drawing:
 * a comparison is two frames — the baseline on the left, the changes on the
 * right, the way the `←` / `→` keys reach for them. A washed frame is on
 * screen; a ghosted one is held back.
 */

const PANEL = { y: "5", width: "8", height: "14", rx: FRAME_RADIUS } as const;
const LEFT_PANEL = { ...PANEL, x: "2" };
const RIGHT_PANEL = { ...PANEL, x: "14" };

export const BaselineViewIcon = createLucideIcon("baseline-view", [
  ["rect", { ...LEFT_PANEL, ...TINT, key: "shown" }],
  ["rect", { ...RIGHT_PANEL, ...GHOST, key: "held-back" }],
]);

export const ChangesViewIcon = createLucideIcon("changes-view", [
  ["rect", { ...LEFT_PANEL, ...GHOST, key: "held-back" }],
  ["rect", { ...RIGHT_PANEL, ...TINT, key: "shown" }],
]);

export const SplitViewIcon = createLucideIcon("split-view", [
  ["rect", { ...LEFT_PANEL, ...TINT, key: "left" }],
  ["rect", { ...RIGHT_PANEL, ...TINT, key: "right" }],
]);

/** Both frames washed, so where they overlap is darker: the onion skin. */
export const OnionViewIcon = createLucideIcon("onion-view", [
  [
    "rect",
    {
      x: "3",
      y: "3",
      width: "12",
      height: "12",
      rx: FRAME_RADIUS,
      ...TINT,
      key: "back",
    },
  ],
  [
    "rect",
    {
      x: "9",
      y: "9",
      width: "12",
      height: "12",
      rx: FRAME_RADIUS,
      ...TINT,
      key: "front",
    },
  ],
]);

/**
 * One frame cut by a divider with a drag handle. The changes, right of the
 * divider, are washed: what the swipe reveals.
 */
export const SwipeViewIcon = createLucideIcon("swipe-view", [
  ["path", { d: "M8 19H6a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3h2", key: "left" }],
  [
    "path",
    { d: "M16 5h2a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3h-2", ...TINT, key: "right" },
  ],
  ["path", { d: "M12 3v6", key: "divider-top" }],
  ["path", { d: "M12 15v6", key: "divider-bottom" }],
  ["circle", { cx: "12", cy: "12", r: "3", key: "handle" }],
]);
