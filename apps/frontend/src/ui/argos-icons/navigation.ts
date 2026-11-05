import { createLucideIcon } from "lucide-react";

import { FRAME, PUPIL, TINT } from "./language";

/*
 * Moving around the page: chevrons, arrows, close, open, search. These are
 * verbs, so most of them are bare ink — a wash appears only where the icon
 * has a subject (the lens, the house, the panel being toggled).
 */

export const ChevronDownIcon = createLucideIcon("chevron-down", [
  ["path", { d: "m6 9 6 6 6-6", key: "chevron" }],
]);

export const ChevronUpIcon = createLucideIcon("chevron-up", [
  ["path", { d: "m18 15-6-6-6 6", key: "chevron" }],
]);

export const ChevronLeftIcon = createLucideIcon("chevron-left", [
  ["path", { d: "m15 18-6-6 6-6", key: "chevron" }],
]);

export const ChevronRightIcon = createLucideIcon("chevron-right", [
  ["path", { d: "m9 18 6-6-6-6", key: "chevron" }],
]);

export const ChevronsUpDownIcon = createLucideIcon("chevrons-up-down", [
  ["path", { d: "m7 15 5 5 5-5", key: "down" }],
  ["path", { d: "m7 9 5-5 5 5", key: "up" }],
]);

export const ChevronsDownUpIcon = createLucideIcon("chevrons-down-up", [
  ["path", { d: "m7 20 5-5 5 5", key: "up" }],
  ["path", { d: "m7 4 5 5 5-5", key: "down" }],
]);

export const ArrowUpIcon = createLucideIcon("arrow-up", [
  ["path", { d: "m5 12 7-7 7 7", key: "head" }],
  ["path", { d: "M12 19V5", key: "shaft" }],
]);

export const ArrowDownIcon = createLucideIcon("arrow-down", [
  ["path", { d: "M12 5v14", key: "shaft" }],
  ["path", { d: "m19 12-7 7-7-7", key: "head" }],
]);

export const ArrowUpDownIcon = createLucideIcon("arrow-up-down", [
  ["path", { d: "m21 16-4 4-4-4", key: "down-head" }],
  ["path", { d: "M17 20V4", key: "down-shaft" }],
  ["path", { d: "m3 8 4-4 4 4", key: "up-head" }],
  ["path", { d: "M7 4v16", key: "up-shaft" }],
]);

export const CornerDownRightIcon = createLucideIcon("corner-down-right", [
  ["path", { d: "m15 10 5 5-5 5", key: "head" }],
  ["path", { d: "M4 4v7a4 4 0 0 0 4 4h12", key: "shaft" }],
]);

export const XIcon = createLucideIcon("x", [
  ["path", { d: "M18 6 6 18", key: "a" }],
  ["path", { d: "m6 6 12 12", key: "b" }],
]);

export const PlusIcon = createLucideIcon("plus", [
  ["path", { d: "M5 12h14", key: "h" }],
  ["path", { d: "M12 5v14", key: "v" }],
]);

export const MinusIcon = createLucideIcon("minus", [
  ["path", { d: "M5 12h14", key: "h" }],
]);

export const CheckIcon = createLucideIcon("check", [
  ["path", { d: "M20 6 9 17l-5-5", key: "check" }],
]);

export const CheckCheckIcon = createLucideIcon("check-check", [
  ["path", { d: "M18 6 7 17l-5-5", key: "first" }],
  ["path", { d: "m22 10-7.5 7.5L13 16", key: "second" }],
]);

export const EllipsisIcon = createLucideIcon(
  "ellipsis",
  [
    ["circle", { cx: "5", cy: "12", r: "1", key: "a" }],
    ["circle", { cx: "12", cy: "12", r: "1", key: "b" }],
    ["circle", { cx: "19", cy: "12", r: "1", key: "c" }],
  ],
  ["more-horizontal"],
);

export const EllipsisVerticalIcon = createLucideIcon(
  "ellipsis-vertical",
  [
    ["circle", { cx: "12", cy: "5", r: "1", key: "a" }],
    ["circle", { cx: "12", cy: "12", r: "1", key: "b" }],
    ["circle", { cx: "12", cy: "19", r: "1", key: "c" }],
  ],
  ["more-vertical"],
);

/** A washed lens: what is being looked through is the subject. */
export const SearchIcon = createLucideIcon("search", [
  ["circle", { cx: "11", cy: "11", r: "8", ...TINT, key: "lens" }],
  ["path", { d: "m21 21-4.3-4.3", key: "handle" }],
]);

export const LinkIcon = createLucideIcon("link", [
  [
    "path",
    {
      d: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71",
      key: "right",
    },
  ],
  [
    "path",
    {
      d: "M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",
      key: "left",
    },
  ],
]);

/**
 * The page being left keeps its wash; the frame breaks open where the arrow
 * leaves it.
 */
export const ExternalLinkIcon = createLucideIcon("external-link", [
  [
    "path",
    {
      d: "M18 13v5a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3h5",
      ...TINT,
      key: "page",
    },
  ],
  ["path", { d: "M15 3h6v6", key: "head" }],
  ["path", { d: "M10 14 21 3", key: "shaft" }],
]);

export const HouseIcon = createLucideIcon(
  "house",
  [
    [
      "path",
      {
        d: "M3 10a2 2 0 0 1 .7-1.5l7-6a2 2 0 0 1 2.6 0l7 6a2 2 0 0 1 .7 1.5v8a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3z",
        ...TINT,
        key: "house",
      },
    ],
    ["path", { d: "M9 21v-6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v6", key: "door" }],
  ],
  ["home"],
);

/** The frame, with the panel it toggles washed. */
export const PanelRightIcon = createLucideIcon("panel-right", [
  ["rect", { ...FRAME, key: "frame" }],
  [
    "path",
    { d: "M15 3h3a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3h-3z", ...TINT, key: "panel" },
  ],
]);

export const MaximizeIcon = createLucideIcon("maximize", [
  ["path", { d: "M8 3H6a3 3 0 0 0-3 3v2", key: "top-left" }],
  ["path", { d: "M21 8V6a3 3 0 0 0-3-3h-2", key: "top-right" }],
  ["path", { d: "M3 16v2a3 3 0 0 0 3 3h2", key: "bottom-left" }],
  ["path", { d: "M16 21h2a3 3 0 0 0 3-3v-2", key: "bottom-right" }],
]);

export const ExpandIcon = createLucideIcon("expand", [
  ["path", { d: "m15 15 6 6", key: "bottom-right" }],
  ["path", { d: "m15 9 6-6", key: "top-right" }],
  ["path", { d: "M21 16v5h-5", key: "bottom-right-head" }],
  ["path", { d: "M21 8V3h-5", key: "top-right-head" }],
  ["path", { d: "M3 16v5h5", key: "bottom-left-head" }],
  ["path", { d: "m3 21 6-6", key: "bottom-left" }],
  ["path", { d: "M3 8V3h5", key: "top-left-head" }],
  ["path", { d: "M9 9 3 3", key: "top-left" }],
]);

export const ShrinkIcon = createLucideIcon("shrink", [
  ["path", { d: "m15 15 6 6m-6-6v4.8m0-4.8h4.8", key: "bottom-right" }],
  ["path", { d: "M9 19.8V15m0 0H4.2M9 15l-6 6", key: "bottom-left" }],
  ["path", { d: "M15 4.2V9m0 0h4.8M15 9l6-6", key: "top-right" }],
  ["path", { d: "M9 4.2V9m0 0H4.2M9 9 3 3", key: "top-left" }],
]);

const ARC_TOP = "M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8";
const ARC_BOTTOM = "M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16";

export const RefreshCcwIcon = createLucideIcon("refresh-ccw", [
  ["path", { d: ARC_TOP, key: "top" }],
  ["path", { d: "M3 3v5h5", key: "top-head" }],
  ["path", { d: ARC_BOTTOM, key: "bottom" }],
  ["path", { d: "M16 16h5v5", key: "bottom-head" }],
]);

/** The refresh arrows around a pupil: a build being worked on. */
export const RefreshCcwDotIcon = createLucideIcon("refresh-ccw-dot", [
  ["path", { d: ARC_TOP, key: "top" }],
  ["path", { d: "M3 3v5h5", key: "top-head" }],
  ["path", { d: ARC_BOTTOM, key: "bottom" }],
  ["path", { d: "M16 16h5v5", key: "bottom-head" }],
  ["circle", { ...PUPIL, key: "pupil" }],
]);

const ROTATE_CCW = "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8";

export const RotateCcwIcon = createLucideIcon("rotate-ccw", [
  ["path", { d: ROTATE_CCW, key: "arc" }],
  ["path", { d: "M3 3v5h5", key: "head" }],
]);

export const HistoryIcon = createLucideIcon(
  "rotate-ccw-clock",
  [
    ["path", { d: ROTATE_CCW, key: "arc" }],
    ["path", { d: "M3 3v5h5", key: "head" }],
    ["path", { d: "M12 7v5l4 2", key: "hands" }],
  ],
  ["history"],
);

export const Undo2Icon = createLucideIcon("undo-2", [
  ["path", { d: "M9 14 4 9l5-5", key: "head" }],
  ["path", { d: "M4 9h10.5a5.5 5.5 0 0 1 0 11H11", key: "shaft" }],
]);

export const Redo2Icon = createLucideIcon("redo-2", [
  ["path", { d: "m15 14 5-5-5-5", key: "head" }],
  ["path", { d: "M20 9H9.5a5.5 5.5 0 0 0 0 11H13", key: "shaft" }],
]);

export const RepeatIcon = createLucideIcon("repeat", [
  ["path", { d: "m17 2 4 4-4 4", key: "top-head" }],
  ["path", { d: "M3 11v-1a4 4 0 0 1 4-4h14", key: "top" }],
  ["path", { d: "m7 22-4-4 4-4", key: "bottom-head" }],
  ["path", { d: "M21 13v1a4 4 0 0 1-4 4H3", key: "bottom" }],
]);
