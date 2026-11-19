import { describe, expect, test } from "vitest";

import type { ScreenshotDiffLayoutShift } from "@/database/models";

import { getLayoutShiftRegions } from "./layout-shift";

function segment(
  x: number,
  width: number,
  baseY: number,
  headY: number,
  height: number,
  dx = 0,
) {
  return { x, width, baseY, headY, height, dy: headY - baseY, dx };
}

function band(x: number, y: number, width: number, height: number) {
  return { x, y, width, height };
}

type Shift = Omit<ScreenshotDiffLayoutShift, "shiftedPixels">;

function hidden(shift: Shift) {
  return getLayoutShiftRegions({ ...shift, shiftedPixels: 1 }).hidden;
}

function moves(shift: Shift) {
  return getLayoutShiftRegions({ ...shift, shiftedPixels: 1 }).moves;
}

// A 30 px banner pushed in at y = 90 of a 200 px wide strip: what was below
// it now starts at 120, and the page grew to 430 px.
const banner: Shift = {
  segments: [segment(0, 200, 90, 120, 310)],
  inserted: [band(0, 90, 200, 30)],
  removed: [],
};

describe("hidden areas", () => {
  test.each<[string, Shift, ReturnType<typeof hidden>]>([
    [
      "hides where the block is and was, around its new rows",
      banner,
      [band(0, 120, 200, 310)],
    ],
    [
      "keeps removed rows, and merges bands that overlap",
      {
        segments: [segment(10, 50, 40, 20, 60)],
        inserted: [band(10, 100, 50, 10)],
        removed: [band(10, 20, 50, 20), band(10, 105, 50, 15)],
      },
      [band(10, 40, 50, 60)],
    ],
    [
      "hides each strip on its own",
      {
        segments: [segment(0, 100, 10, 50, 40), segment(300, 80, 0, 20, 60)],
        inserted: [band(300, 0, 80, 20)],
        removed: [],
      },
      [band(0, 10, 100, 80), band(300, 20, 80, 60)],
    ],
    [
      "hides nothing without a segment",
      { segments: [], inserted: [], removed: [] },
      [],
    ],
    [
      "takes the areas iris reports over the bands",
      {
        ...banner,
        hidden: [band(0, 120, 200, 100), band(250, 120, 60, 40)],
      },
      [band(0, 120, 200, 100), band(250, 120, 60, 40)],
    ],
  ])("%s", (_name, shift, expected) => {
    expect(hidden(shift)).toEqual(expected);
  });
});

describe("moves", () => {
  test.each<[string, Shift, ReturnType<typeof moves>]>([
    ["keeps a block that moved", banner, [segment(0, 200, 90, 120, 310)]],
    [
      "drops a block that only sits over removed rows",
      {
        // The rows of a table that changed colour, matching rows elsewhere
        // by coincidence: every one of them is a real change.
        segments: [segment(0, 100, 224, 190, 13)],
        inserted: [],
        removed: [band(0, 190, 100, 34)],
      },
      [],
    ],
    [
      "cuts removed rows out of a block, and drops what is too thin",
      {
        segments: [segment(0, 100, 0, 50, 100)],
        inserted: [band(0, 0, 100, 50)],
        // Leaves 50-60, a 2 px sliver at 80-82, and 90-150.
        removed: [band(0, 60, 100, 20), band(0, 82, 100, 8)],
      },
      [segment(0, 100, 0, 50, 10), segment(0, 100, 40, 90, 60)],
    ],
    [
      "joins touching parts that moved together, not the others",
      {
        segments: [
          segment(0, 100, 10, 40, 20),
          segment(0, 100, 30, 60, 20),
          segment(0, 100, 70, 80, 20),
          segment(200, 50, 10, 100, 20),
        ],
        inserted: [],
        removed: [],
      },
      [
        segment(0, 100, 10, 40, 40),
        segment(0, 100, 70, 80, 20),
        segment(200, 50, 10, 100, 20),
      ],
    ],
    [
      "keeps how far a block moved sideways, and joins only what moved alike",
      {
        segments: [
          segment(100, 80, 10, 10, 20, -8),
          segment(100, 80, 30, 30, 20, -8),
          segment(100, 80, 50, 50, 20, 1),
        ],
        inserted: [],
        removed: [],
      },
      [segment(100, 80, 10, 10, 40, -8), segment(100, 80, 50, 50, 20, 1)],
    ],
    [
      "reads removed rows of its own strip only",
      {
        segments: [segment(0, 100, 0, 20, 30), segment(200, 100, 0, 20, 30)],
        inserted: [],
        removed: [band(200, 20, 100, 30)],
      },
      [segment(0, 100, 0, 20, 30)],
    ],
  ])("%s", (_name, shift, expected) => {
    expect(moves(shift)).toEqual(expected);
  });
});
