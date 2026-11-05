import { createLucideIcon } from "lucide-react";

import { FILE, FILE_FOLD, FRAME, FRAME_RADIUS, TINT } from "./language";

/*
 * What a build is made of: screenshots and the files around them. A
 * screenshot is a washed frame, a file a washed page; a badge in a corner
 * (added, removed) opens the frame there rather than overlapping it.
 */

const SUN = { cx: "9", cy: "9", r: "2" } as const;
const MOUNTAIN = "m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21";

export const ImageIcon = createLucideIcon("image", [
  ["rect", { ...FRAME, ...TINT, key: "frame" }],
  ["circle", { ...SUN, key: "sun" }],
  ["path", { d: MOUNTAIN, key: "mountain" }],
]);

export const ImagePlusIcon = createLucideIcon("image-plus", [
  [
    "path",
    {
      d: "M21 11.5V18a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3h6.5",
      ...TINT,
      key: "frame",
    },
  ],
  ["path", { d: "M16 5h6", key: "h" }],
  ["path", { d: "M19 2v6", key: "v" }],
  ["circle", { ...SUN, key: "sun" }],
  ["path", { d: MOUNTAIN, key: "mountain" }],
]);

export const ImageMinusIcon = createLucideIcon("image-minus", [
  [
    "path",
    {
      d: "M21 9v9a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3h7",
      ...TINT,
      key: "frame",
    },
  ],
  ["path", { d: "M16 5h6", key: "h" }],
  ["circle", { ...SUN, key: "sun" }],
  ["path", { d: MOUNTAIN, key: "mountain" }],
]);

/** The front screenshot carries the wash; the stack peeks out behind. */
export const ImagesIcon = createLucideIcon("images", [
  [
    "rect",
    {
      x: "8",
      y: "2",
      width: "14",
      height: "14",
      rx: FRAME_RADIUS,
      ...TINT,
      key: "front",
    },
  ],
  [
    "path",
    { d: "M4 8a2 2 0 0 0-2 2v9a3 3 0 0 0 3 3h9a2 2 0 0 0 2-2", key: "back" },
  ],
  ["circle", { cx: "13", cy: "7", r: "1", fill: "currentColor", key: "sun" }],
  ["path", { d: "m22 11-1.3-1.3a2.4 2.4 0 0 0-3.4 0L11 16", key: "mountain" }],
]);

/**
 * A stack of builds waiting their turn. The squares are under 12, so they
 * keep Lucide's radius.
 */
export const SquareStackIcon = createLucideIcon("square-stack", [
  [
    "path",
    { d: "M4 10a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2", key: "back" },
  ],
  [
    "path",
    {
      d: "M10 16a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2",
      key: "middle",
    },
  ],
  [
    "rect",
    {
      x: "14",
      y: "14",
      width: "8",
      height: "8",
      rx: "2",
      ...TINT,
      key: "front",
    },
  ],
]);

export const FileIcon = createLucideIcon("file", [
  ["path", { d: FILE, ...TINT, key: "page" }],
  ["path", { d: FILE_FOLD, key: "fold" }],
]);

export const FileTextIcon = createLucideIcon("file-text", [
  ["path", { d: FILE, ...TINT, key: "page" }],
  ["path", { d: FILE_FOLD, key: "fold" }],
  ["path", { d: "M10 9H8", key: "line-1" }],
  ["path", { d: "M16 13H8", key: "line-2" }],
  ["path", { d: "M16 17H8", key: "line-3" }],
]);

export const FileUpIcon = createLucideIcon("file-up", [
  ["path", { d: FILE, ...TINT, key: "page" }],
  ["path", { d: FILE_FOLD, key: "fold" }],
  ["path", { d: "M12 18v-6", key: "shaft" }],
  ["path", { d: "m9 15 3-3 3 3", key: "head" }],
]);

export const FileDownIcon = createLucideIcon("file-down", [
  ["path", { d: FILE, ...TINT, key: "page" }],
  ["path", { d: FILE_FOLD, key: "fold" }],
  ["path", { d: "M12 12v6", key: "shaft" }],
  ["path", { d: "m15 15-3 3-3-3", key: "head" }],
]);
