import { memo } from "react";
import { useAtomValue } from "jotai/react";
import { ArrowDownIcon, ArrowUpIcon } from "lucide-react";

import { Badge } from "@/ui/Badge";

import type { LayoutShiftMove } from "./layoutShift";
import {
  layoutShiftVisibleAtom,
  overlayColorAtom,
  overlayVisibleAtom,
} from "./OverlayStyle";
import { useImageProjection } from "./projection";
import type { PaneSize } from "./Zoomer";

/**
 * The blocks of a snapshot that moved, outlined where they sit in one of its
 * two screenshots and labelled with how far they went. They replace the part
 * of the mask that only moved, so a page pushed down by a new banner reads as
 * one block that moved, not as a wall of changes.
 *
 * Positioned in the pane's screen space rather than inside the zoomed image,
 * so the outline stays thin and the label readable at any zoom.
 */
export const LayoutShiftMoves = memo(function LayoutShiftMoves(props: {
  moves: ReadonlyArray<LayoutShiftMove>;
  /** The screenshot in the pane: where each block was, or where it is now. */
  side: "base" | "head";
  paneSize: PaneSize | null;
  /** The mask's pixel space, which the moves are expressed in. */
  imgSize: { width: number; height: number };
}) {
  const { moves, side, paneSize, imgSize } = props;
  const overlayVisible = useAtomValue(overlayVisibleAtom);
  const visible = useAtomValue(layoutShiftVisibleAtom);
  const color = useAtomValue(overlayColorAtom);
  const { toScreen, ready } = useImageProjection({ paneSize, imgSize });
  if (!overlayVisible || !visible || !ready) {
    return null;
  }
  return moves.map((move) => {
    const y = side === "head" ? move.headY : move.baseY;
    const start = toScreen({
      x: move.x / imgSize.width,
      y: y / imgSize.height,
    });
    const end = toScreen({
      x: (move.x + move.width) / imgSize.width,
      y: (y + move.height) / imgSize.height,
    });
    const Icon = move.dy > 0 ? ArrowDownIcon : ArrowUpIcon;
    const distance = `${Math.abs(move.dy)} px`;
    return (
      <div
        key={`${move.x}:${move.headY}`}
        role="img"
        aria-label={`Moved ${move.dy > 0 ? "down" : "up"} ${distance}`}
        className="absolute border border-dashed"
        style={{
          left: start.left,
          top: start.top,
          width: end.left - start.left,
          height: end.top - start.top,
          borderColor: color,
        }}
      >
        <Badge className="absolute top-1 right-1 flex items-center gap-0.5 whitespace-nowrap shadow-xs">
          <Icon className="size-3" style={{ color }} />
          {distance}
        </Badge>
      </div>
    );
  });
});
