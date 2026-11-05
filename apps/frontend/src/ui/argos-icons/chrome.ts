import { createLucideIcon } from "lucide-react";

import { FRAME, FRAME_RADIUS, TINT } from "./language";

/*
 * The page around the screenshots: filters on the list, the build header,
 * the account menu.
 */

const FUNNEL =
  "M10 20a1 1 0 0 0 .55.9l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .52-1.34L21.74 4.67A1 1 0 0 0 21 3H3a1 1 0 0 0-.74 1.67l7.22 7.99A2 2 0 0 1 10 14z";

export const FunnelIcon = createLucideIcon(
  "funnel",
  [["path", { d: FUNNEL, ...TINT, key: "funnel" }]],
  ["filter"],
);

/** The funnel opens at the corner its badge sits in, like the image badges. */
export const FunnelPlusIcon = createLucideIcon("funnel-plus", [
  [
    "path",
    {
      d: "M13.35 3H3a1 1 0 0 0-.74 1.67l7.22 7.99A2 2 0 0 1 10 14v6a1 1 0 0 0 .55.9l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .52-1.34l1.22-1.35",
      ...TINT,
      key: "funnel",
    },
  ],
  ["path", { d: "M16 6h6", key: "h" }],
  ["path", { d: "M19 3v6", key: "v" }],
]);

export const FunnelXIcon = createLucideIcon(
  "funnel-x",
  [
    [
      "path",
      {
        d: "M12.53 3H3a1 1 0 0 0-.74 1.67l7.22 7.99A2 2 0 0 1 10 14v6a1 1 0 0 0 .55.9l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .52-1.34l.43-.47",
        ...TINT,
        key: "funnel",
      },
    ],
    ["path", { d: "m16.5 3.5 5 5", key: "x-a" }],
    ["path", { d: "m21.5 3.5-5 5", key: "x-b" }],
  ],
  ["filter-x"],
);

/** Monitoring mode: a control tower, its cab washed. */
export const TowerControlIcon = createLucideIcon("tower-control", [
  [
    "path",
    {
      d: "M18.2 12.27 20 6H4l1.8 6.27a1 1 0 0 0 .95.73h10.5a1 1 0 0 0 .96-.73Z",
      ...TINT,
      key: "cab",
    },
  ],
  ["path", { d: "M8 13v9", key: "shaft-left" }],
  ["path", { d: "M16 22v-9", key: "shaft-right" }],
  ["path", { d: "m9 6 1 7", key: "window-left" }],
  ["path", { d: "m15 6-1 7", key: "window-right" }],
  ["path", { d: "M12 6V2", key: "mast" }],
  ["path", { d: "M13 2h-2", key: "antenna" }],
]);

/** A screenshot's journey across builds: washed stops on a route. */
export const WaypointsIcon = createLucideIcon("waypoints", [
  ["path", { d: "m10.59 5.41-5.18 5.18", key: "to-left" }],
  ["path", { d: "m18.59 13.41-5.18 5.18", key: "to-bottom" }],
  ["path", { d: "M6 12h12", key: "across" }],
  ["circle", { cx: "12", cy: "20", r: "2", ...TINT, key: "bottom" }],
  ["circle", { cx: "12", cy: "4", r: "2", ...TINT, key: "top" }],
  ["circle", { cx: "20", cy: "12", r: "2", ...TINT, key: "right" }],
  ["circle", { cx: "4", cy: "12", r: "2", ...TINT, key: "left" }],
]);

export const BotIcon = createLucideIcon("bot", [
  ["path", { d: "M12 8V4H8", key: "antenna" }],
  [
    "rect",
    {
      x: "4",
      y: "8",
      width: "16",
      height: "12",
      rx: FRAME_RADIUS,
      ...TINT,
      key: "head",
    },
  ],
  ["path", { d: "M2 14h2", key: "ear-left" }],
  ["path", { d: "M20 14h2", key: "ear-right" }],
  ["path", { d: "M15 13v2", key: "eye-right" }],
  ["path", { d: "M9 13v2", key: "eye-left" }],
]);

export const SettingsIcon = createLucideIcon("settings", [
  [
    "path",
    {
      d: "M9.67 4.14a2.34 2.34 0 0 1 4.66 0 2.34 2.34 0 0 0 3.32 1.91 2.34 2.34 0 0 1 2.33 4.04 2.34 2.34 0 0 0 0 3.82 2.34 2.34 0 0 1-2.33 4.04 2.34 2.34 0 0 0-3.32 1.91 2.34 2.34 0 0 1-4.66 0 2.34 2.34 0 0 0-3.32-1.91 2.34 2.34 0 0 1-2.33-4.04 2.34 2.34 0 0 0 0-3.82 2.34 2.34 0 0 1 2.33-4.04 2.34 2.34 0 0 0 3.32-1.91",
      ...TINT,
      key: "gear",
    },
  ],
  ["circle", { cx: "12", cy: "12", r: "3", key: "axle" }],
]);

export const SquareActivityIcon = createLucideIcon(
  "square-activity",
  [
    ["rect", { ...FRAME, ...TINT, key: "frame" }],
    ["path", { d: "M17 12h-2l-2 5-2-10-2 5H7", key: "pulse" }],
  ],
  ["activity-square"],
);

/** A command line, drawn as its window so it carries a frame like the rest. */
export const TerminalIcon = createLucideIcon("terminal", [
  ["rect", { ...FRAME, ...TINT, key: "window" }],
  ["path", { d: "m7 9 3 3-3 3", key: "prompt" }],
  ["path", { d: "M13 15h4", key: "cursor" }],
]);

export const CommandIcon = createLucideIcon("command", [
  [
    "path",
    {
      d: "M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3",
      key: "command",
    },
  ],
]);

/** The room being left is washed; the arrow walks out of it. */
export const LogOutIcon = createLucideIcon("log-out", [
  [
    "path",
    { d: "M9 21H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3h3", ...TINT, key: "door" },
  ],
  ["path", { d: "M21 12H9", key: "shaft" }],
  ["path", { d: "m16 17 5-5-5-5", key: "head" }],
]);
