import { createLucideIcon } from "lucide-react";

import { FRAME_RADIUS, PUPIL, STATUS_RING, TINT, TINT_ONLY } from "./language";

/*
 * What a screenshot is about: the test that took it, the story it renders,
 * the device and color scheme it was shot in, and the build overview's
 * summaries of all of them.
 */

/** A test: the flask, with the wash as the liquid in it. */
export const FlaskConicalIcon = createLucideIcon("flask-conical", [
  [
    "path",
    {
      d: "M6.45 15h11.1l2.2 4.04A2 2 0 0 1 18 22H6a2 2 0 0 1-1.75-2.96z",
      ...TINT_ONLY,
      key: "liquid",
    },
  ],
  [
    "path",
    {
      d: "M14 2v6a2 2 0 0 0 .25.96l5.5 10.08A2 2 0 0 1 18 22H6a2 2 0 0 1-1.75-2.96l5.5-10.08A2 2 0 0 0 10 8V2",
      key: "flask",
    },
  ],
  ["path", { d: "M6.45 15h11.1", key: "surface" }],
  ["path", { d: "M8.5 2h7", key: "rim" }],
]);

/** A story: the book, with its bookmark ribbon washed. */
export const BookMarkedIcon = createLucideIcon(
  "book-bookmark",
  [
    ["path", { d: "M10 2v8l3-2.5 3 2.5V2", ...TINT, key: "ribbon" }],
    [
      "path",
      {
        d: "M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20",
        key: "book",
      },
    ],
  ],
  ["book-marked"],
);

export const PlayIcon = createLucideIcon("play", [
  [
    "path",
    {
      d: "M5 5a2 2 0 0 1 3-1.73l12 7a2 2 0 0 1 0 3.46l-12 7A2 2 0 0 1 5 19z",
      ...TINT,
      key: "play",
    },
  ],
]);

/** A component: four parts, each washed. */
export const ComponentIcon = createLucideIcon("component", [
  ["path", { d: "M12 3 15 6 12 9 9 6z", ...TINT, key: "top" }],
  ["path", { d: "M18 9 21 12 18 15 15 12z", ...TINT, key: "right" }],
  ["path", { d: "M12 15 15 18 12 21 9 18z", ...TINT, key: "bottom" }],
  ["path", { d: "M6 9 9 12 6 15 3 12z", ...TINT, key: "left" }],
]);

/** A trace: the bug, and the replay of how it happened, washed. */
export const BugPlayIcon = createLucideIcon("bug-play", [
  ["path", { d: "M9 7.13V6a3 3 0 1 1 6 0v1.13", key: "head" }],
  [
    "path",
    {
      d: "M10 19.66A6 6 0 0 1 6 14v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 3.97",
      key: "body",
    },
  ],
  ["path", { d: "M6 13H2", key: "leg-middle" }],
  ["path", { d: "M3 21a4 4 0 0 1 3.81-4", key: "leg-bottom" }],
  ["path", { d: "M3 5a4 4 0 0 0 3.55 3.97", key: "leg-top-left" }],
  ["path", { d: "M21 5a4 4 0 0 1-3.55 3.97", key: "leg-top-right" }],
  [
    "path",
    {
      d: "M14 15a1 1 0 0 1 1.52-.86l5 3a1 1 0 0 1 0 1.72l-5 3A1 1 0 0 1 14 21z",
      ...TINT,
      key: "play",
    },
  ],
]);

/** An SDK update is available. */
export const CloudDownloadIcon = createLucideIcon(
  "cloud-download",
  [
    [
      "path",
      {
        d: "M4.39 15.27A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.44 8.28",
        ...TINT,
        key: "cloud",
      },
    ],
    ["path", { d: "M12 13v8", key: "shaft" }],
    ["path", { d: "m8 17 4 4 4-4", key: "head" }],
  ],
  ["download-cloud"],
);

/** An SDK Argos no longer supports. */
export const PackageXIcon = createLucideIcon("package-x", [
  [
    "path",
    {
      d: "M21 10.5V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l.13-.07",
      ...TINT,
      key: "box",
    },
  ],
  ["path", { d: "M3.29 7 12 12l8.71-5", key: "lid" }],
  ["path", { d: "M12 22V12", key: "edge" }],
  ["path", { d: "m7.5 4.27 9 5.15", key: "tape" }],
  ["path", { d: "m16.5 14.5 5 5", key: "x-a" }],
  ["path", { d: "m16.5 19.5 5-5", key: "x-b" }],
]);

/** Variants: two sliders whose knobs carry the wash. */
export const SlidersHorizontalIcon = createLucideIcon("sliders-horizontal", [
  ["path", { d: "M3 7h9", key: "top-left" }],
  ["path", { d: "M18 7h3", key: "top-right" }],
  ["circle", { cx: "15", cy: "7", r: "3", ...TINT, key: "top-knob" }],
  ["path", { d: "M3 17h3", key: "bottom-left" }],
  ["path", { d: "M12 17h9", key: "bottom-right" }],
  ["circle", { cx: "9", cy: "17", r: "3", ...TINT, key: "bottom-knob" }],
]);

export const TagIcon = createLucideIcon("tag", [
  [
    "path",
    {
      d: "M12.59 2.59A2 2 0 0 0 11.17 2H4a2 2 0 0 0-2 2v7.17a2 2 0 0 0 .59 1.42l8.7 8.7a2.43 2.43 0 0 0 3.42 0l6.58-6.58a2.43 2.43 0 0 0 0-3.42z",
      ...TINT,
      key: "tag",
    },
  ],
  [
    "circle",
    { cx: "7.5", cy: "7.5", r: ".5", fill: "currentColor", key: "hole" },
  ],
]);

/** The diff threshold: a target whose bull's-eye is the pupil. */
export const TargetIcon = createLucideIcon("target", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "outer" }],
  ["circle", { cx: "12", cy: "12", r: "6", ...TINT, key: "inner" }],
  ["circle", { ...PUPIL, key: "bullseye" }],
]);

export const GlobeIcon = createLucideIcon("globe", [
  ["circle", { ...STATUS_RING, key: "globe" }],
  [
    "path",
    { d: "M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20", key: "meridian" },
  ],
  ["path", { d: "M2 12h20", key: "equator" }],
]);

/** The dial is washed and closed at its base, so it reads as a gauge face. */
export const GaugeIcon = createLucideIcon("gauge", [
  ["path", { d: "M3.34 19a10 10 0 1 1 17.32 0z", ...TINT, key: "dial" }],
  ["path", { d: "m12 14 4-4", key: "needle" }],
]);

/** Impact analysis: a washed scope, a sweep, and one contact on it. */
export const RadarIcon = createLucideIcon("radar", [
  ["circle", { ...STATUS_RING, key: "scope" }],
  ["circle", { cx: "12", cy: "12", r: "4", key: "range" }],
  ["path", { d: "m12 12 5-5", key: "sweep" }],
  ["path", { d: "M7 17h.01", key: "contact" }],
]);

/** A next step to take. */
export const LightbulbIcon = createLucideIcon("lightbulb", [
  [
    "path",
    {
      d: "M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5",
      ...TINT,
      key: "bulb",
    },
  ],
  ["path", { d: "M9 18h6", key: "base" }],
  ["path", { d: "M10 22h4", key: "tip" }],
]);

/*
 * Devices: the screen is the subject, so the screen is washed and the stand
 * or the base stays bare.
 */

export const MonitorIcon = createLucideIcon("monitor", [
  [
    "rect",
    {
      x: "2",
      y: "3",
      width: "20",
      height: "14",
      rx: FRAME_RADIUS,
      ...TINT,
      key: "screen",
    },
  ],
  ["path", { d: "M12 17v4", key: "stand" }],
  ["path", { d: "M8 21h8", key: "foot" }],
]);

export const LaptopIcon = createLucideIcon("laptop", [
  [
    "rect",
    {
      x: "4",
      y: "4",
      width: "16",
      height: "12",
      rx: FRAME_RADIUS,
      ...TINT,
      key: "screen",
    },
  ],
  ["path", { d: "M2 20h20", key: "base" }],
]);

export const TabletIcon = createLucideIcon("tablet", [
  [
    "rect",
    {
      x: "4",
      y: "2",
      width: "16",
      height: "20",
      rx: FRAME_RADIUS,
      ...TINT,
      key: "body",
    },
  ],
  ["path", { d: "M12 18h.01", key: "button" }],
]);

export const SmartphoneIcon = createLucideIcon("smartphone", [
  [
    "rect",
    {
      x: "5",
      y: "2",
      width: "14",
      height: "20",
      rx: FRAME_RADIUS,
      ...TINT,
      key: "body",
    },
  ],
  ["path", { d: "M12 18h.01", key: "button" }],
]);

/** Viewports: the phone in front is washed, the monitor stands behind. */
export const MonitorSmartphoneIcon = createLucideIcon("monitor-smartphone", [
  [
    "path",
    {
      d: "M18 8V7a3 3 0 0 0-3-3H5a3 3 0 0 0-3 3v5a3 3 0 0 0 3 3h7",
      key: "monitor",
    },
  ],
  ["path", { d: "M10 15v4", key: "stand" }],
  ["path", { d: "M7 19h5", key: "foot" }],
  [
    "rect",
    {
      x: "16",
      y: "12",
      width: "6",
      height: "10",
      rx: "2",
      ...TINT,
      key: "phone",
    },
  ],
]);

/** Print media: the sheet coming out is washed. */
export const PrinterIcon = createLucideIcon("printer", [
  [
    "path",
    {
      d: "M6 18H5a3 3 0 0 1-3-3v-3a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v3a3 3 0 0 1-3 3h-1",
      key: "body",
    },
  ],
  ["path", { d: "M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6", key: "tray" }],
  [
    "rect",
    {
      x: "6",
      y: "14",
      width: "12",
      height: "8",
      rx: "1",
      ...TINT,
      key: "sheet",
    },
  ],
]);

/*
 * Color schemes. Light is a washed sun, dark a washed moon, and "both" is a
 * sphere half in solid shadow — a wash is too faint to say "dark" at 16px —
 * lit on the side its rays point to. With rays on one
 * side only, the sphere sits left of center to keep the drawing centered.
 */

export const SunIcon = createLucideIcon("sun", [
  ["circle", { cx: "12", cy: "12", r: "4", ...TINT, key: "sun" }],
  ["path", { d: "M12 2v2", key: "top" }],
  ["path", { d: "M12 20v2", key: "bottom" }],
  ["path", { d: "M2 12h2", key: "left" }],
  ["path", { d: "M20 12h2", key: "right" }],
  ["path", { d: "m4.93 4.93 1.41 1.41", key: "top-left" }],
  ["path", { d: "m19.07 4.93-1.41 1.41", key: "top-right" }],
  ["path", { d: "m6.34 17.66-1.41 1.41", key: "bottom-left" }],
  ["path", { d: "m17.66 17.66 1.41 1.41", key: "bottom-right" }],
]);

export const MoonIcon = createLucideIcon("moon", [
  [
    "path",
    {
      d: "M20.99 12.49a9 9 0 1 1-9.48-9.47c.41-.03.62.46.4.8a6 6 0 0 0 8.27 8.27c.35-.22.83-.01.81.4",
      ...TINT,
      key: "moon",
    },
  ],
]);

export const SunMoonIcon = createLucideIcon("sun-moon", [
  [
    "path",
    {
      d: "M9 8a4 4 0 0 0 0 8z",
      fill: "currentColor",
      stroke: "none",
      key: "shadow",
    },
  ],
  ["circle", { cx: "9", cy: "12", r: "4", key: "sphere" }],
  ["path", { d: "M9 2v2", key: "top" }],
  ["path", { d: "M9 20v2", key: "bottom" }],
  ["path", { d: "M17 12h2", key: "right" }],
  ["path", { d: "m16.07 4.93-1.41 1.41", key: "top-right" }],
  ["path", { d: "m14.66 17.66 1.41 1.41", key: "bottom-right" }],
]);
