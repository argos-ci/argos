import { createLucideIcon, type IconNode } from "lucide-react";

import { FRAME, TINT } from "./language";

/*
 * The comment editor's toolbar and slash menu. Letterforms stay bare ink —
 * a wash inside a B reads as a bolder B — except where the mark is a block
 * (a quote, a code block) and the wash is the block.
 */

export const BoldIcon = createLucideIcon(
  "letter-b",
  [
    [
      "path",
      {
        d: "M6 12h9a4 4 0 0 1 0 8H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h7a4 4 0 0 1 0 8",
        key: "b",
      },
    ],
  ],
  ["bold"],
);

export const ItalicIcon = createLucideIcon("italic", [
  ["path", { d: "M19 4h-9", key: "top" }],
  ["path", { d: "M14 20H5", key: "bottom" }],
  ["path", { d: "M15 4 9 20", key: "stem" }],
]);

export const UnderlineIcon = createLucideIcon("underline", [
  ["path", { d: "M6 4v6a6 6 0 0 0 12 0V4", key: "u" }],
  ["path", { d: "M4 20h16", key: "line" }],
]);

export const StrikethroughIcon = createLucideIcon("strikethrough", [
  ["path", { d: "M16 4H9a3 3 0 0 0-2.83 4", key: "top" }],
  ["path", { d: "M14 12a4 4 0 0 1 0 8H6", key: "bottom" }],
  ["path", { d: "M4 12h16", key: "line" }],
]);

const HEADING: IconNode = [
  ["path", { d: "M4 12h8", key: "bar" }],
  ["path", { d: "M4 18V6", key: "left" }],
  ["path", { d: "M12 18V6", key: "right" }],
];

export const Heading1Icon = createLucideIcon("heading-1", [
  ...HEADING,
  ["path", { d: "m17 12 3-2v8", key: "one" }],
]);

export const Heading2Icon = createLucideIcon("heading-2", [
  ...HEADING,
  ["path", { d: "M21 18h-4c0-4 4-3 4-6 0-1.5-2-2.5-4-1", key: "two" }],
]);

export const Heading3Icon = createLucideIcon("heading-3", [
  ...HEADING,
  [
    "path",
    { d: "M17.5 10.5c1.7-1 3.5 0 3.5 1.5a2 2 0 0 1-2 2", key: "three-top" },
  ],
  [
    "path",
    { d: "M17 17.5c2 1.5 4 .3 4-1.5a2 2 0 0 0-2-2", key: "three-bottom" },
  ],
]);

export const ListIcon = createLucideIcon("list", [
  ["path", { d: "M3 5h.01", key: "dot-1" }],
  ["path", { d: "M3 12h.01", key: "dot-2" }],
  ["path", { d: "M3 19h.01", key: "dot-3" }],
  ["path", { d: "M8 5h13", key: "line-1" }],
  ["path", { d: "M8 12h13", key: "line-2" }],
  ["path", { d: "M8 19h13", key: "line-3" }],
]);

export const ListOrderedIcon = createLucideIcon("list-ordered", [
  ["path", { d: "M11 5h10", key: "line-1" }],
  ["path", { d: "M11 12h10", key: "line-2" }],
  ["path", { d: "M11 19h10", key: "line-3" }],
  ["path", { d: "M4 4h1v5", key: "one" }],
  ["path", { d: "M4 9h2", key: "one-base" }],
  [
    "path",
    {
      d: "M6.5 20H3.4c0-1 2.6-1.93 2.6-3.5a1.5 1.5 0 0 0-2.6-1.02",
      key: "two",
    },
  ],
]);

const QUOTE_MARK =
  "a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z";

export const QuoteIcon = createLucideIcon("quote", [
  ["path", { d: `M16 3${QUOTE_MARK}`, ...TINT, key: "right" }],
  ["path", { d: `M5 3${QUOTE_MARK}`, ...TINT, key: "left" }],
]);

export const CodeIcon = createLucideIcon("code", [
  ["path", { d: "m16 18 6-6-6-6", key: "right" }],
  ["path", { d: "m8 6-6 6 6 6", key: "left" }],
]);

export const SquareCodeIcon = createLucideIcon(
  "square-code",
  [
    ["rect", { ...FRAME, ...TINT, key: "block" }],
    ["path", { d: "m10 9-3 3 3 3", key: "left" }],
    ["path", { d: "m14 15 3-3-3-3", key: "right" }],
  ],
  ["code-square"],
);
