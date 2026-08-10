import { useCallback } from "react";

import { useScaleContext } from "./ScaleContext";
import { useZoomTransform, type PaneSize } from "./Zoomer";

export type NormalizedPoint = { x: number; y: number };
export type ScreenPoint = { left: number; top: number };

/**
 * Maps between an image's normalized coordinates (0–1 of its width/height) and
 * pixel positions within the pane's content box. It accounts for the image being
 * horizontally centered and top-aligned, scaled by `imgScale`, then moved by the
 * live pan/zoom transform — the same `imgToWorkspace` math that places the change
 * highlights (see `RectHighlights`).
 *
 * Shared by a build's screenshot comments and an uploaded media's, because a
 * normalized anchor means the same thing on both and neither can position by CSS
 * percentage once the image can be panned and zoomed.
 */
export function useImageProjection(params: {
  paneSize: PaneSize | null;
  imgSize: { width: number; height: number };
  /**
   * How the image sits in the pane before any pan/zoom: the build's snapshots
   * are top-aligned, the media share page centers its image. Must match the
   * CSS, or every projected point drifts by the alignment offset.
   */
  verticalAlign?: "top" | "center";
}) {
  const { paneSize, imgSize, verticalAlign = "top" } = params;
  const transform = useZoomTransform();
  const [imgScale] = useScaleContext();

  const getOffsets = useCallback(
    (): { x: number; y: number } => ({
      x: paneSize ? (paneSize.width - imgSize.width * imgScale) / 2 : 0,
      y:
        paneSize && verticalAlign === "center"
          ? Math.max(0, (paneSize.height - imgSize.height * imgScale) / 2)
          : 0,
    }),
    [paneSize, imgSize.width, imgSize.height, imgScale, verticalAlign],
  );

  const toScreen = useCallback(
    (point: NormalizedPoint): ScreenPoint => {
      const offsets = getOffsets();
      const workspaceX = point.x * imgSize.width * imgScale + offsets.x;
      const workspaceY = point.y * imgSize.height * imgScale + offsets.y;
      return {
        left: workspaceX * transform.scale + transform.x,
        top: workspaceY * transform.scale + transform.y,
      };
    },
    [getOffsets, imgSize.width, imgSize.height, imgScale, transform],
  );

  const toNormalized = useCallback(
    (paneX: number, paneY: number): NormalizedPoint | null => {
      if (!paneSize || !imgScale) {
        return null;
      }
      const offsets = getOffsets();
      const workspaceX = (paneX - transform.x) / transform.scale;
      const workspaceY = (paneY - transform.y) / transform.scale;
      return {
        x: (workspaceX - offsets.x) / (imgSize.width * imgScale),
        y: (workspaceY - offsets.y) / (imgSize.height * imgScale),
      };
    },
    [paneSize, getOffsets, imgSize.width, imgSize.height, imgScale, transform],
  );

  return { toScreen, toNormalized, ready: Boolean(paneSize && imgScale) };
}

/** Whether a normalized point falls within the image bounds. */
export function isPointInImage(point: NormalizedPoint): boolean {
  return point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1;
}

/**
 * The scale a contain-fitted image is rendered at — what `ScaleContext` carries,
 * and what makes the projection above agree with the pixels on screen.
 *
 * The smaller of the two axis ratios, which is what `object-contain` itself
 * picks: whichever axis runs out first is the one the image is fitted to. Taking
 * the axis the image's *orientation* suggests instead reads the wrong number
 * whenever the box it sits in doesn't share the image's ratio — and then every
 * projected point is off by that factor.
 *
 * Null when there is nothing to scale yet (or ever): an image that failed to
 * load reports zero natural size, and dividing by it yields an `Infinity` that
 * looks like a valid scale and turns every projection into `NaN`.
 */
export function getImageScale(element: HTMLImageElement): number | null {
  const { naturalWidth, naturalHeight } = element;
  if (!naturalWidth || !naturalHeight) {
    return null;
  }
  return Math.min(element.width / naturalWidth, element.height / naturalHeight);
}
