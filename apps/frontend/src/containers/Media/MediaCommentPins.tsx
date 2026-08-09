import { clsx } from "clsx";

import {
  isPointInImage,
  useImageProjection,
  type NormalizedPoint,
  type ScreenPoint,
} from "@/containers/Build/projection";
import {
  ZOOMER_OVERLAY_INTERACTIVE_CLASS,
  type PaneSize,
} from "@/containers/Build/Zoomer";
import { CommentPin } from "@/containers/Comment/CommentPin";

/** A normalized point on the media: 0–1 of its width and height. */
export type MediaPoint = NormalizedPoint;

export type MediaPin = {
  /** The root comment of the thread this pin belongs to. */
  commentId: string;
  point: MediaPoint;
  /** 1-based, matching the number shown beside the thread in the panel. */
  index: number;
};

/**
 * Pins drawn over a media at the points their comments refer to.
 *
 * Positioned by projecting each normalized anchor through the pane's live pan/zoom
 * transform, which is what a CSS percentage cannot do: once the image can be
 * zoomed, a pin at `62%` of the *container* stops being at 62% of the *image*, and
 * quietly points at the wrong pixel. The projection is the same one the build's
 * screenshot comments use, so a pin means the same thing on both.
 *
 * Clicking a pin selects its thread in the panel beside the media, which is a
 * better fit than the build page's floating popover — the thread is already on
 * screen, so there is nothing to pop over.
 */
export function MediaCommentPins(props: {
  pins: MediaPin[];
  /** The pane's content-box size, from `ZoomPane`'s overlay callback. */
  paneSize: PaneSize | null;
  /** The media's intrinsic size, which the anchors are relative to. */
  imgSize: { width: number; height: number };
  selectedCommentId: string | null;
  onSelect: (commentId: string) => void;
  /** Where a comment is about to be placed, while the composer is open. */
  draftPoint: MediaPoint | null;
  /** Placing mode: the media takes a crosshair and a click sets the point. */
  placing: boolean;
  onPlace: (point: MediaPoint) => void;
}) {
  const {
    pins,
    paneSize,
    imgSize,
    selectedCommentId,
    onSelect,
    draftPoint,
    placing,
    onPlace,
  } = props;
  const { toScreen, toNormalized, ready } = useImageProjection({
    paneSize,
    imgSize,
  });

  if (!ready) {
    return null;
  }

  // A pin panned out of view must not be drawn on the pane's edge, where it would
  // claim to mark a pixel that is not on screen.
  const visible = pins.filter((pin) => isPointInImage(pin.point));

  return (
    <>
      {placing ? (
        <PlacingSurface
          onPlace={(paneX, paneY) => {
            const point = toNormalized(paneX, paneY);
            if (point && isPointInImage(point)) {
              onPlace(point);
            }
          }}
        />
      ) : null}
      {visible.map((pin) => (
        <PinButton
          key={pin.commentId}
          index={pin.index}
          at={toScreen(pin.point)}
          selected={pin.commentId === selectedCommentId}
          onSelect={() => onSelect(pin.commentId)}
        />
      ))}
      {draftPoint && isPointInImage(draftPoint) ? (
        // The build's draft pin, unchanged: "your comment will go here" is the
        // same statement on both surfaces.
        <CommentPin point={toScreen(draftPoint)} avatar={null} />
      ) : null}
    </>
  );
}

/**
 * The whole pane, turned into one target that reports where it was clicked.
 *
 * A button rather than a bare click handler so it is reachable by keyboard and
 * announced by a screen reader. A key press carries no coordinates, so it places
 * the pin at the center — the point a reviewer can then describe in words, and a
 * working path to a pinned comment for anyone not using a mouse.
 */
function PlacingSurface(props: {
  onPlace: (paneX: number, paneY: number) => void;
}) {
  return (
    <button
      type="button"
      aria-label="Pick the spot to comment on"
      // The Zoomer starts a pan from any overlay child that isn't marked
      // interactive, which would make a click-to-place drag the image instead.
      className={`${ZOOMER_OVERLAY_INTERACTIVE_CLASS} pointer-events-auto absolute inset-0 cursor-crosshair focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none`}
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        // `detail` is 0 for a keyboard-triggered click, where clientX/Y are too.
        if (event.detail === 0) {
          props.onPlace(rect.width / 2, rect.height / 2);
          return;
        }
        props.onPlace(event.clientX - rect.left, event.clientY - rect.top);
      }}
    />
  );
}

function PinButton(props: {
  index: number;
  at: ScreenPoint;
  selected: boolean;
  onSelect: () => void;
}) {
  const { index, at, selected, onSelect } = props;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`Comment ${index}`}
      aria-pressed={selected}
      style={{ left: at.left, top: at.top }}
      className={clsx(
        ZOOMER_OVERLAY_INTERACTIVE_CLASS,
        // The pin's bottom-left corner sits on the point, so the badge never
        // covers the pixel it is pointing at — the same anchoring as the build's
        // `CommentPin` and `CommentMarker`, so a pin reads the same on both.
        // Fixed screen size, deliberately: a marker that grew with the zoom would
        // swallow the detail being inspected.
        "pointer-events-auto absolute z-10 -translate-y-full",
        "rounded-chip flex size-9 items-center justify-center rounded-bl-none border",
        "text-xs font-semibold tabular-nums shadow-md transition",
        "focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none",
        selected
          ? "bg-primary-solid border-primary scale-110 text-white"
          : "bg-app border-primary text-default hover:scale-110",
      )}
    >
      {index}
    </button>
  );
}
