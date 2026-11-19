import { memo } from "react";
import { useAtomValue } from "jotai/react";
import {
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpIcon,
} from "lucide-react";

import { Badge } from "@/ui/Badge";

import type { LayoutShiftMove } from "./layoutShift";
import {
  layoutShiftVisibleAtom,
  overlayColorAtom,
  overlayVisibleAtom,
} from "./OverlayStyle";
import { useImageProjection } from "./projection";
import type { PaneSize } from "./Zoomer";

/** How far a block went down or up, then right or left: the ways it moved. */
function getMoveSteps(move: LayoutShiftMove) {
  return [
    move.dy > 0 && {
      direction: "down",
      Icon: ArrowDownIcon,
      distance: move.dy,
    },
    move.dy < 0 && { direction: "up", Icon: ArrowUpIcon, distance: -move.dy },
    move.dx > 0 && {
      direction: "right",
      Icon: ArrowRightIcon,
      distance: move.dx,
    },
    move.dx < 0 && {
      direction: "left",
      Icon: ArrowLeftIcon,
      distance: -move.dx,
    },
  ].filter((step) => step !== false);
}

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
  const { toScreenRect, ready } = useImageProjection({ paneSize, imgSize });
  if (!overlayVisible || !visible || !ready) {
    return null;
  }
  return moves.map((move) => {
    const [x, y] =
      side === "head" ? [move.x, move.headY] : [move.x - move.dx, move.baseY];
    const rect = toScreenRect({
      x: x / imgSize.width,
      y: y / imgSize.height,
      width: move.width / imgSize.width,
      height: move.height / imgSize.height,
    });
    const steps = getMoveSteps(move);
    return (
      <div
        key={`${move.x}:${move.headY}`}
        role="img"
        aria-label={`Moved ${steps
          .map((step) => `${step.direction} ${step.distance} px`)
          .join(" and ")}`}
        className="absolute border border-dashed"
        style={{ ...rect, borderColor: color }}
      >
        <Badge className="absolute top-1 right-1 flex items-center gap-1.5 whitespace-nowrap shadow-xs">
          {steps.map(({ direction, Icon, distance }) => (
            <span key={direction} className="flex items-center gap-0.5">
              <Icon className="size-3" style={{ color }} />
              {distance} px
            </span>
          ))}
        </Badge>
      </div>
    );
  });
});
