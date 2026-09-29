/**
 * The emoji picker's geometry, shared by the grid and the Suspense fallback that
 * stands in for it while `EmojiPickerGrid` loads — which is why it cannot live
 * in that module: importing it from the fallback would pull the emojibase
 * dataset into the static graph.
 */

export const COLUMNS = 9;
export const CELL_SIZE = 28;
export const HEADER_HEIGHT = 28;
export const VIEWPORT_HEIGHT = 256;
export const GRID_PADDING_X = 8;
export const GRID_WIDTH = COLUMNS * CELL_SIZE;
export const PICKER_WIDTH = GRID_WIDTH + GRID_PADDING_X * 2;

/**
 * The box of the search field above the grid.
 *
 * Its height is not a constant: the hairline border is never drawn thinner than
 * one pixel of the zoomed page, so the field is 38.5px tall at zoom 1 and 38px
 * at zoom 2. Anything that has to match it lays out this same box instead.
 */
export const searchFieldClassName =
  "border-b-thin px-3 py-2.5 text-sm leading-tight";
