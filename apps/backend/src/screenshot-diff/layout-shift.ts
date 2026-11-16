import type { ScreenshotDiffLayoutShift } from "@/database/models";

type Rect = { x: number; y: number; width: number; height: number };
type Segment = ScreenshotDiffLayoutShift["segments"][number];

/**
 * Rows a move has to span to be drawn: iris's own floor for a shift. A block
 * cut to a sliver by the removed rows around it is still hidden from the mask,
 * but an outline that thin reads as noise.
 */
const MIN_MOVE_HEIGHT = 4;

type Interval = [start: number, end: number];

/**
 * iris cuts the mask into column strips. Segments, inserted and removed bands
 * of one strip all carry its `x` and `width`.
 */
function getStripKey(rect: { x: number; width: number }) {
  return `${rect.x}:${rect.width}`;
}

/** The rows `rects` cover in `strip`, as sorted, merged half-open intervals. */
function getStripRows(
  rects: Rect[],
  strip: { x: number; width: number },
): Interval[] {
  const key = getStripKey(strip);
  const sorted = rects
    .filter((rect) => getStripKey(rect) === key)
    .map((rect): Interval => [rect.y, rect.y + rect.height])
    .sort((a, b) => a[0] - b[0]);
  const merged: Interval[] = [];
  for (const [start, end] of sorted) {
    const last = merged.at(-1);
    if (last && start <= last[1]) {
      last[1] = Math.max(last[1], end);
    } else {
      merged.push([start, end]);
    }
  }
  return merged;
}

/** `[start, end)` without the merged intervals `holes`. */
function subtract(start: number, end: number, holes: Interval[]): Interval[] {
  const pieces: Interval[] = [];
  let cursor = start;
  for (const [holeStart, holeEnd] of holes) {
    if (holeEnd <= cursor) {
      continue;
    }
    if (holeStart >= end) {
      break;
    }
    if (holeStart > cursor) {
      pieces.push([cursor, holeStart]);
    }
    cursor = Math.max(cursor, holeEnd);
  }
  if (cursor < end) {
    pieces.push([cursor, end]);
  }
  return pieces;
}

/**
 * The areas of the mask whose pixels differ only because content moved, to be
 * left out of it. In a strip that holds a shift, every row is part of a block
 * that moved, or of a band that is new (`inserted`) or gone (`removed`): the
 * hidden rows are all the others. The rows above and below the strip's first
 * and last difference hold nothing to hide, so the strip is taken whole.
 */
function getHiddenRects(
  shift: ScreenshotDiffLayoutShift,
  maskHeight: number,
): Rect[] {
  const strips = new Map(
    shift.segments.map((segment) => [getStripKey(segment), segment]),
  );
  const bands = [...shift.inserted, ...shift.removed];
  return [...strips.values()].flatMap((strip) =>
    subtract(0, maskHeight, getStripRows(bands, strip)).map(([start, end]) => ({
      x: strip.x,
      y: start,
      width: strip.width,
      height: end - start,
    })),
  );
}

/**
 * The parts of the moved blocks that are hidden from the mask, to be drawn
 * instead, top to bottom. A block's rows that sit over removed rows of the
 * base are real changes, so they stay in the mask and out of the moves.
 * Touching parts of a strip that moved by the same amount are one move.
 */
function getMoves(shift: ScreenshotDiffLayoutShift): Segment[] {
  const pieces = shift.segments
    .flatMap((segment) =>
      subtract(
        segment.headY,
        segment.headY + segment.height,
        getStripRows(shift.removed, segment),
      ).map(([start, end]) => ({
        ...segment,
        headY: start,
        baseY: start - segment.dy,
        height: end - start,
      })),
    )
    .sort((a, b) => a.x - b.x || a.headY - b.headY);

  const moves: Segment[] = [];
  for (const piece of pieces) {
    const last = moves.at(-1);
    if (
      last &&
      getStripKey(last) === getStripKey(piece) &&
      last.dy === piece.dy &&
      last.headY + last.height === piece.headY
    ) {
      last.height += piece.height;
    } else {
      moves.push(piece);
    }
  }
  return moves
    .filter((move) => move.height >= MIN_MOVE_HEIGHT)
    .sort((a, b) => a.headY - b.headY || a.x - b.x);
}

/**
 * What a layout shift changes in how a diff reads: the areas left out of its
 * mask, and the moves to draw in their place.
 */
export function getLayoutShiftRegions(
  shift: ScreenshotDiffLayoutShift,
  maskHeight: number,
): { hidden: Rect[]; moves: Segment[] } {
  return {
    hidden: getHiddenRects(shift, maskHeight),
    moves: getMoves(shift),
  };
}
