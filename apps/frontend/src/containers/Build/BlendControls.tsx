import { useRef } from "react";
import { invariant } from "@argos/util/invariant";
import { clsx } from "clsx";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { Slider, SliderThumb, SliderTrack } from "@/ui/Slider";
import { useEventCallback } from "@/ui/useEventCallback";

import { useScaleContext } from "./ScaleContext";
import { useZoomTransform, ZOOMER_OVERLAY_INTERACTIVE_CLASS } from "./Zoomer";

/**
 * Draggable divider revealing the "after" side of a blended pane in swipe view.
 * Shared by the build's diff viewer (which wires it to its view-mode atoms) and
 * the media share page's compare mode (local state).
 *
 * Drawn in the pane's screen space rather than over the image. Sizing it in
 * image space meant dividing every length by the zoom, and those tiny lengths
 * get quantized by layout before being scaled back up, which is what made the
 * bar thicken and the chevrons wobble once zoomed in. Here the lengths are
 * plain pixels and only the position goes through the transform.
 */
export function SwipeDivider(props: {
  paneSize: { width: number; height: number };
  imgSize: { width: number; height: number };
  /** Vertical placement of the image in the pane — must match the CSS. */
  verticalAlign?: "top" | "center";
  /** Horizontal position of the divider, as a fraction of the image width. */
  position: number;
  onPositionChange: (position: number) => void;
  /**
   * Vertical position of the handle along the divider, as a fraction of the
   * image height. Only moves the handle, so it can be slid out of the way of
   * the area being compared.
   */
  handleY: number;
  onHandleYChange: (handleY: number) => void;
}) {
  const {
    paneSize,
    imgSize,
    verticalAlign = "top",
    position,
    onPositionChange,
    handleY,
    onHandleYChange,
  } = props;
  const transform = useZoomTransform();
  const [imgScale] = useScaleContext();
  const rootRef = useRef<HTMLDivElement>(null);

  // The image is centered in the pane and laid out at `imgScale`, then the zoom
  // transform applies on top of that.
  const imageWidth = imgSize.width * imgScale;
  const imageHeight = imgSize.height * imgScale;
  const offsetX = (paneSize.width - imageWidth) / 2;
  const offsetY =
    verticalAlign === "center"
      ? Math.max(0, (paneSize.height - imageHeight) / 2)
      : 0;
  const toPaneX = (fraction: number) =>
    (fraction * imageWidth + offsetX) * transform.scale + transform.x;
  const toPaneY = (fraction: number) =>
    (fraction * imageHeight + offsetY) * transform.scale + transform.y;

  const paneX = toPaneX(position);
  const imageTop = toPaneY(0);

  /**
   * Moves the divider to the pointer, and the handle along with it when the
   * handle itself is the one being dragged.
   */
  const moveToPointer = useEventCallback(
    (event: React.PointerEvent, moveHandle: boolean) => {
      const root = rootRef.current;
      if (!root || imageWidth === 0 || imageHeight === 0) {
        return;
      }
      const rect = root.getBoundingClientRect();
      const x =
        (event.clientX - rect.left - transform.x) / transform.scale - offsetX;
      onPositionChange(clampFraction(x / imageWidth));
      if (moveHandle) {
        const y =
          (event.clientY - rect.top - transform.y) / transform.scale - offsetY;
        onHandleYChange(clampFraction(y / imageHeight));
      }
    },
  );

  return (
    <div ref={rootRef} className="pointer-events-none absolute inset-0">
      <div
        className={clsx(
          ZOOMER_OVERLAY_INTERACTIVE_CLASS,
          "pointer-events-auto absolute w-6 -translate-x-1/2 cursor-ew-resize",
        )}
        style={{
          left: paneX,
          top: imageTop,
          height: toPaneY(1) - imageTop,
        }}
        onPointerDown={(event) => {
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          moveToPointer(event, false);
        }}
        onPointerMove={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            moveToPointer(event, false);
          }
        }}
      >
        {/* No shadow: anything bleeding out of the bar would tint the pixels on
            both sides, which are the ones being compared. */}
        <div className="bg-solid absolute inset-y-0 left-1/2 w-px -translate-x-1/2" />
      </div>
      {/* Sibling of the bar rather than a child, so dragging it does not also
          bubble into the bar's horizontal-only drag. The box itself is
          transparent: only the two chevrons flanking the bar are drawn, so
          nothing covers the pixels being compared. */}
      <div
        className={clsx(
          ZOOMER_OVERLAY_INTERACTIVE_CLASS,
          "pointer-events-auto absolute flex h-5 -translate-x-1/2 -translate-y-1/2 cursor-grab items-center justify-center gap-0.75 text-(--background-color-solid) active:cursor-grabbing",
        )}
        style={{ left: paneX, top: toPaneY(handleY) }}
        onPointerDown={(event) => {
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          moveToPointer(event, true);
        }}
        onPointerMove={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            moveToPointer(event, true);
          }
        }}
      >
        <ChevronLeftIcon className="size-3" />
        <ChevronRightIcon className="size-3" />
      </div>
    </div>
  );
}

function clampFraction(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/**
 * Floating slider fading the "after" layer over the "before" in onion skin
 * view. The labels name the two layers, so callers say what is being blended —
 * the build fades changes over a baseline, a media fades an after over a
 * before.
 */
export function OnionOpacityControl(props: {
  value: number;
  onChange: (value: number) => void;
  /** @default "Baseline" */
  startLabel?: string;
  /** @default "Changes" */
  endLabel?: string;
}) {
  const {
    value,
    onChange,
    startLabel = "Baseline",
    endLabel = "Changes",
  } = props;
  return (
    // Keyboard-adjusting the slider uses arrow keys, which are also view
    // hotkeys: disable hotkeys while the focus is inside the control.
    <div
      data-hotkeys-disabled=""
      className="bg-app border-thin absolute bottom-3 left-1/2 z-10 flex w-72 -translate-x-1/2 items-center gap-3 rounded-md px-3 py-1.5 shadow-sm"
    >
      <span className="text-low text-xs select-none">{startLabel}</span>
      <Slider
        aria-label="Onion skin opacity"
        className="flex-1"
        min={0}
        max={100}
        value={value * 100}
        onValueChange={(next) => {
          invariant(typeof next === "number", "Opacity must be a number");
          onChange(next / 100);
        }}
      >
        <SliderTrack>
          <SliderThumb />
        </SliderTrack>
      </Slider>
      <span className="text-low text-xs select-none">{endLabel}</span>
    </div>
  );
}
