import { createLucideIcon } from "lucide-react";

import { FRAME, GHOST, PUPIL, STATUS_RING, TINT } from "./language";

/*
 * Statuses: of a build, of a change, of a review. Each one is a washed badge
 * with a bare mark inside, so a column of them reads as one family whose
 * color and mark carry the difference.
 */

export const CircleCheckIcon = createLucideIcon(
  "circle-check",
  [
    ["circle", { ...STATUS_RING, key: "ring" }],
    ["path", { d: "m8 12 3 3 5-5", key: "check" }],
  ],
  ["check-circle-2"],
);

export const CircleXIcon = createLucideIcon(
  "circle-x",
  [
    ["circle", { ...STATUS_RING, key: "ring" }],
    ["path", { d: "m15 9-6 6", key: "a" }],
    ["path", { d: "m9 9 6 6", key: "b" }],
  ],
  ["x-circle"],
);

export const CircleAlertIcon = createLucideIcon(
  "circle-exclamation-point",
  [
    ["circle", { ...STATUS_RING, key: "ring" }],
    ["path", { d: "M12 8v4", key: "bar" }],
    ["path", { d: "M12 16h.01", key: "dot" }],
  ],
  ["alert-circle", "circle-alert"],
);

export const InfoIcon = createLucideIcon("info", [
  ["circle", { ...STATUS_RING, key: "ring" }],
  ["path", { d: "M12 16v-4", key: "bar" }],
  ["path", { d: "M12 8h.01", key: "dot" }],
]);

export const CirclePlusIcon = createLucideIcon(
  "circle-plus",
  [
    ["circle", { ...STATUS_RING, key: "ring" }],
    ["path", { d: "M8 12h8", key: "h" }],
    ["path", { d: "M12 8v8", key: "v" }],
  ],
  ["plus-circle"],
);

export const CircleMinusIcon = createLucideIcon(
  "circle-minus",
  [
    ["circle", { ...STATUS_RING, key: "ring" }],
    ["path", { d: "M8 12h8", key: "h" }],
  ],
  ["minus-circle"],
);

/** A pupil in the badge: queued, watching for its turn. */
export const CircleDotIcon = createLucideIcon("circle-dot", [
  ["circle", { ...STATUS_RING, key: "ring" }],
  ["circle", { ...PUPIL, key: "pupil" }],
]);

export const CircleSlashIcon = createLucideIcon("circle-slash", [
  ["circle", { ...STATUS_RING, key: "ring" }],
  ["path", { d: "m9 15 6-6", key: "slash" }],
]);

export const BanIcon = createLucideIcon("ban", [
  ["circle", { ...STATUS_RING, key: "ring" }],
  ["path", { d: "M4.93 4.93 19.07 19.07", key: "slash" }],
]);

export const ClockIcon = createLucideIcon("clock", [
  ["circle", { ...STATUS_RING, key: "ring" }],
  ["path", { d: "M12 6v6l4 2", key: "hands" }],
]);

export const TriangleAlertIcon = createLucideIcon(
  "triangle-exclamation-point",
  [
    [
      "path",
      {
        d: "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",
        ...TINT,
        key: "triangle",
      },
    ],
    ["path", { d: "M12 9v4", key: "bar" }],
    ["path", { d: "M12 17h.01", key: "dot" }],
  ],
  ["alert-triangle", "triangle-alert"],
);

export const BadgeCheckIcon = createLucideIcon(
  "badge-check",
  [
    [
      "path",
      {
        d: "M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z",
        ...TINT,
        key: "badge",
      },
    ],
    ["path", { d: "m8 12 3 3 5-5", key: "check" }],
  ],
  ["verified"],
);

export const SquareSlashIcon = createLucideIcon(
  "square-slash",
  [
    ["rect", { ...FRAME, ...TINT, key: "frame" }],
    ["path", { d: "m9 15 6-6", key: "slash" }],
  ],
  ["slash-square"],
);

/** The sand has run out: only the lower bulb is washed. */
export const HourglassIcon = createLucideIcon("hourglass", [
  ["path", { d: "M5 22h14", key: "base" }],
  ["path", { d: "M5 2h14", key: "top" }],
  [
    "path",
    {
      d: "M17 22v-4.2a2 2 0 0 0-.6-1.4L12 12l-4.4 4.4a2 2 0 0 0-.6 1.4V22",
      ...TINT,
      key: "lower",
    },
  ],
  [
    "path",
    {
      d: "M7 2v4.2a2 2 0 0 0 .6 1.4L12 12l4.4-4.4a2 2 0 0 0 .6-1.4V2",
      key: "upper",
    },
  ],
]);

export const PauseIcon = createLucideIcon("pause", [
  [
    "rect",
    { x: "5", y: "3", width: "5", height: "18", rx: "2", ...TINT, key: "left" },
  ],
  [
    "rect",
    {
      x: "14",
      y: "3",
      width: "5",
      height: "18",
      rx: "2",
      ...TINT,
      key: "right",
    },
  ],
]);

const BOOKMARK = "M5 21V6a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v15l-7-4z";

export const BookmarkCheckIcon = createLucideIcon("bookmark-check", [
  ["path", { d: BOOKMARK, ...TINT, key: "bookmark" }],
  ["path", { d: "m9 10 2 2 4-4", key: "check" }],
]);

export const BookmarkXIcon = createLucideIcon("bookmark-x", [
  ["path", { d: BOOKMARK, ...TINT, key: "bookmark" }],
  ["path", { d: "m14.5 7.5-5 5", key: "a" }],
  ["path", { d: "m9.5 7.5 5 5", key: "b" }],
]);

/**
 * A change taken out of the review: the flag that would raise it, ghosted.
 */
export const FlagOffIcon = createLucideIcon("flag-off", [
  ["path", { d: "M4 22V4", key: "pole" }],
  [
    "path",
    {
      d: "M4 4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 7.3 2q2 0 3.1-.8A1 1 0 0 1 20 4v10a1 1 0 0 1-.4.8A6 6 0 0 1 16 16c-3 0-5-2-8-2a6 6 0 0 0-4 1.5",
      ...GHOST,
      key: "flag",
    },
  ],
]);

/** Flaky: a result that will not hold still. */
export const WavesIcon = createLucideIcon(
  "waves-horizontal",
  [
    ["path", { d: "M2 5q2.5 2 5 0t5 0 5 0 5 0", key: "top" }],
    ["path", { d: "M2 12q2.5 2 5 0t5 0 5 0 5 0", key: "middle" }],
    ["path", { d: "M2 19q2.5 2 5 0t5 0 5 0 5 0", key: "bottom" }],
  ],
  ["waves"],
);
