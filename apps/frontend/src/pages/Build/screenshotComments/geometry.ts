import { useCallback } from "react";

import { useScaleContext } from "@/containers/Build/ScaleContext";
import { useZoomTransform, type PaneSize } from "@/containers/Build/Zoomer";

export type NormalizedPoint = { x: number; y: number };
export type ScreenPoint = { left: number; top: number };

/**
 * Maps between a screenshot's normalized coordinates (0–1 of its width/height)
 * and pixel positions within the pane's content box. It accounts for the image
 * being horizontally centered and top-aligned, scaled by `imgScale`, then moved
 * by the live pan/zoom transform — the same `imgToWorkspace` math that places
 * the change highlights (see `RectHighlights`).
 */
export function useScreenshotProjection(params: {
  paneSize: PaneSize | null;
  imgSize: { width: number; height: number };
}) {
  const { paneSize, imgSize } = params;
  const transform = useZoomTransform();
  const [imgScale] = useScaleContext();

  const toScreen = useCallback(
    (point: NormalizedPoint): ScreenPoint => {
      const offsetX = paneSize
        ? (paneSize.width - imgSize.width * imgScale) / 2
        : 0;
      const workspaceX = point.x * imgSize.width * imgScale + offsetX;
      const workspaceY = point.y * imgSize.height * imgScale;
      return {
        left: workspaceX * transform.scale + transform.x,
        top: workspaceY * transform.scale + transform.y,
      };
    },
    [paneSize, imgSize.width, imgSize.height, imgScale, transform],
  );

  const toNormalized = useCallback(
    (paneX: number, paneY: number): NormalizedPoint | null => {
      if (!paneSize || !imgScale) {
        return null;
      }
      const offsetX = (paneSize.width - imgSize.width * imgScale) / 2;
      const workspaceX = (paneX - transform.x) / transform.scale;
      const workspaceY = (paneY - transform.y) / transform.scale;
      return {
        x: (workspaceX - offsetX) / (imgSize.width * imgScale),
        y: workspaceY / (imgSize.height * imgScale),
      };
    },
    [paneSize, imgSize.width, imgSize.height, imgScale, transform],
  );

  return { toScreen, toNormalized, ready: Boolean(paneSize && imgScale) };
}

/** Whether a normalized point falls within the image bounds. */
export function isPointInImage(point: NormalizedPoint): boolean {
  return point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1;
}
