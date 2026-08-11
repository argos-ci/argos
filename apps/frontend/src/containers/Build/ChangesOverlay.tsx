import { memo, useMemo, useRef, useState } from "react";
import { invariant } from "@argos/util/invariant";
import { useAtomValue } from "jotai/react";

import { ButtonGroup } from "@/ui/ButtonGroup";
import { imgkit } from "@/ui/ImageKitPicture";
import { useEventCallback } from "@/ui/useEventCallback";
import { useColoredRects } from "@/util/color-detection/hook";
import type { Rect } from "@/util/color-detection/types";

import {
  Highlighter,
  useBuildDiffHighlighterContext,
} from "./BuildDiffHighlighterContext";
import { overlayColorAtom, useOverlayStyle } from "./OverlayStyle";
import { useScaleContext } from "./ScaleContext";
import { HighlightButton } from "./toolbar/HighlightButton";
import {
  GoToNextChangesButton,
  GoToPreviousChangesButton,
} from "./toolbar/NavChangesButton";
import { OverlayToggle } from "./toolbar/OverlayToggle";
import { SettingsButton } from "./toolbar/SettingsButton";
import {
  useZoomerSyncContext,
  useZoomTransform,
  type PaneSize,
} from "./Zoomer";

type Dimensions = { width: number; height: number };

/**
 * Everything a reviewer does with a diff mask, in one cluster: show or hide it,
 * step through the areas it marks, and restyle it.
 *
 * Shared by the build's diff toolbar and the media share page's compare toolbar.
 * The two surfaces run the same engine over comparable images and produce the
 * same kind of answer, so a reviewer who learned the controls on a build finds
 * them — and their shortcuts — unchanged on a before/after pair.
 *
 * Renders a fragment rather than its own row: each toolbar owns its separators
 * and spacing.
 */
export const ChangesOverlayControls = memo(function ChangesOverlayControls() {
  return (
    <>
      <OverlayToggle />
      <ButtonGroup>
        <GoToPreviousChangesButton />
        <HighlightButton />
        <GoToNextChangesButton />
      </ButtonGroup>
      <SettingsButton />
    </>
  );
});

/**
 * The mask, painted in the reviewer's overlay colour.
 *
 * The mask is a PNG whose opaque pixels are the changed ones, so it is used as a
 * CSS mask over a flat fill rather than drawn as an image: that is what lets the
 * colour and the opacity be settings instead of something baked in by the
 * engine.
 *
 * Sizing is the caller's, because the two surfaces get it from different places:
 * a build sizes the span from an invisible copy of the mask passed as
 * `children`, while a media pane knows the box already and states it outright.
 */
export function ChangesMask(props: {
  /** The mask image. */
  url: string;
  className?: string;
  style?: React.CSSProperties;
  /** Laid out inside the span, purely to give it a size. */
  children?: React.ReactNode;
}) {
  const style = useOverlayStyle({ src: props.url });
  return (
    <span className={props.className} style={{ ...style, ...props.style }}>
      {props.children}
    </span>
  );
}

/**
 * The changed areas of a mask, circled on demand and navigable one by one.
 *
 * Reads the mask's opaque blocks in a worker, then registers itself as the
 * page's {@link Highlighter} so the toolbar's highlight and next/previous
 * buttons — and their hotkeys — act on it. Nothing is drawn until they do: the
 * circles are an answer to "where should I look", not permanent chrome.
 *
 * Positioned in the pane's screen space, so it has to know the same two things
 * the layout does: which box is centred in the pane, and how the image sits in
 * it vertically.
 */
export function ChangesHighlights(props: {
  /** The mask itself. Converted to JPEG here — the detector cannot read PNG alpha. */
  url: string;
  paneSize: PaneSize;
  /** The mask's own pixel space, which the rects are expressed in. */
  imgSize: Dimensions;
  /**
   * The box laid out in the pane, when it is not the mask itself — a mask is the
   * union of the two images it compares, so it can be taller than the one on
   * screen while sharing its pixel grid.
   *
   * @default imgSize
   */
  layoutSize?: Dimensions;
  /** Vertical placement of the image in the pane — must match the CSS. */
  verticalAlign?: "top" | "center";
}) {
  const { url, paneSize, imgSize, layoutSize = imgSize, verticalAlign } = props;
  const color = useAtomValue(overlayColorAtom);
  const containerRef = useRef<HTMLDivElement>(null);
  const transform = useZoomTransform();
  const jpgUrl = useMemo(() => getChangesDetectionUrl(url), [url]);
  const { rects } = useColoredRects({ url: jpgUrl, blockSize: 24 });
  const [imgScale] = useScaleContext();
  const realScale = imgScale ? imgScale * transform.scale : null;
  // Convert image coordinates to pane coordinates.
  // The laid-out box is centered in the pane and scaled with imgScale; the mask
  // shares its pixel grid, anchored at its top left.
  const imgToWorkspace = (x: number, y: number): [number, number] => {
    const x1 = (paneSize.width - layoutSize.width * imgScale) / 2;
    const y1 =
      verticalAlign === "center"
        ? Math.max(0, (paneSize.height - layoutSize.height * imgScale) / 2)
        : 0;
    return [x * imgScale + x1, y * imgScale + y1];
  };
  const { registerHighlighter } = useBuildDiffHighlighterContext();
  const highlight: Highlighter["highlight"] = useEventCallback(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const elements = Array.from(container.children);
    elements.forEach((element) => {
      const circle = element.firstChild;
      invariant(circle instanceof SVGCircleElement);
      const className = "animate-highlight-svg";
      if (!circle.classList.contains(className)) {
        circle.classList.add(className);
        circle.addEventListener("animationend", () => {
          circle.classList.remove(className);
        });
      }
    });
  });

  const [index, setIndex] = useState<number | null>(null);
  const { zoomTo } = useZoomerSyncContext();
  const go: Highlighter["go"] = useEventCallback((direction) => {
    invariant(rects);
    const i = index === null ? (direction === 1 ? -1 : rects.length) : index;
    const nextIndex = (i + direction + rects.length) % rects.length;
    const rect = rects[nextIndex];
    invariant(rect);
    const [x, y] = imgToWorkspace(rect.x, rect.y);
    const maxScale = 2 / imgScale;
    zoomTo(
      {
        x,
        y,
        width: rect.width * imgScale,
        height: rect.height * imgScale,
      },
      { maxScale },
    );
    setIndex(nextIndex);
  });

  const highlighter: Highlighter = useMemo(
    () => ({ highlight, go }),
    [highlight, go],
  );

  const registerContainer = useEventCallback(
    (element: HTMLDivElement | null) => {
      containerRef.current = element;
      return registerHighlighter(highlighter);
    },
  );

  if (!rects || !realScale) {
    return null;
  }

  return (
    <div ref={registerContainer}>
      {rects.map((rect, index) => {
        const square = rectToSquare(rect, 40 / realScale);
        const [x, y] = imgToWorkspace(square.x, square.y);

        return (
          <svg
            key={index}
            className="pointer-events-none absolute z-10 origin-center overflow-visible"
            style={{
              top: y * transform.scale + transform.y,
              left: x * transform.scale + transform.x,
              width: square.width * imgScale * transform.scale,
              height: square.height * imgScale * transform.scale,
            }}
          >
            <circle
              className="opacity-0"
              cx="50%"
              cy="50%"
              r="50%"
              fill="none"
              stroke={color}
              strokeWidth="1"
            />
          </svg>
        );
      })}
    </div>
  );
}

/**
 * The URL the changed-area detector reads a mask from.
 *
 * JPEG, because the detector looks for coloured blocks and a mask's information
 * is in its alpha channel — which flattening to JPEG turns into the colour it
 * can see.
 */
export function getChangesDetectionUrl(url: string): string {
  return imgkit(url, ["f-jpg"]);
}

function rectToSquare(rect: Rect, minSize: number): Rect {
  const size = Math.max(rect.width, rect.height, minSize);
  const x = rect.x + (rect.width - size) / 2;
  const y = rect.y + (rect.height - size) / 2;
  return {
    x,
    y,
    width: size,
    height: size,
  };
}
