import { useMemo } from "react";

import { graphql, type DocumentType } from "@/gql";
import type { Rect } from "@/util/color-detection/types";

const _LayoutShiftFragment = graphql(`
  fragment LayoutShift_LayoutShift on LayoutShift {
    hidden {
      x
      y
      width
      height
    }
    moves {
      x
      width
      baseY
      headY
      height
      dy
      dx
    }
  }
`);

type LayoutShift = DocumentType<typeof _LayoutShiftFragment>;

export type LayoutShiftMove = LayoutShift["moves"][number];

/** Whether a diff has moved blocks to draw, and so a toggle to show them. */
export function checkDiffHasLayoutShift(diff: {
  layoutShift?: LayoutShift | null;
}): boolean {
  return Boolean(diff.layoutShift?.moves.length);
}

/**
 * An image as large as the mask, opaque everywhere but in `holes`, to
 * intersect the mask with. The holes never overlap — strips are disjoint and
 * so are the rows cut from each — so even-odd filling punches each one out.
 */
export function getMaskHolesImageUrl(
  holes: ReadonlyArray<Rect>,
  size: { width: number; height: number },
): string {
  const { width, height } = size;
  const path = [
    `M0 0H${width}V${height}H0Z`,
    ...holes.map(
      (hole) =>
        `M${hole.x} ${hole.y}h${hole.width}v${hole.height}h${-hole.width}Z`,
    ),
  ].join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges"><path fill-rule="evenodd" d="${path}"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** The image that leaves what only moved out of a diff's mask. */
export function useLayoutShiftClipUrl(diff: {
  layoutShift?: LayoutShift | null;
  width?: number | null;
  height?: number | null;
}): string | undefined {
  const { layoutShift, width, height } = diff;
  return useMemo(
    () =>
      layoutShift && width && height
        ? getMaskHolesImageUrl(layoutShift.hidden, { width, height })
        : undefined,
    [layoutShift, width, height],
  );
}
