import { clsx } from "clsx";
import { MessageSquareIcon } from "lucide-react";

/** A normalized point on the media: 0–1 of its width and height. */
export type MediaPoint = { x: number; y: number };

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
 * Positioned in **percentages** of the container rather than in pixels, so a pin
 * stays on its spot through every resize with no measuring, no listeners and no
 * reflow bookkeeping. That is the whole reason media comments don't need the
 * projection math the build's screenshot layer carries: there is no pan or zoom
 * here, so the anchor *is* a CSS position.
 *
 * Clicking a pin selects its thread in the panel beside the media, which is a
 * better fit than the build page's floating popover — the thread is already
 * on screen, so there is nothing to pop over.
 */
export function MediaCommentPins(props: {
  pins: MediaPin[];
  selectedCommentId: string | null;
  onSelect: (commentId: string) => void;
  /** Where a comment is about to be placed, while the composer is open. */
  draftPoint: MediaPoint | null;
  /** Placing mode: the media takes a crosshair and a click sets the point. */
  placing: boolean;
  onPlace: (point: MediaPoint) => void;
}) {
  const { pins, selectedCommentId, onSelect, draftPoint, placing, onPlace } =
    props;

  return (
    // Only intercepts pointer events while placing; otherwise the layer must not
    // stop the media from being right-clicked, selected or played.
    <div
      className={clsx("absolute inset-0", !placing && "pointer-events-none")}
    >
      {placing ? <PlacingSurface onPlace={onPlace} /> : null}
      {pins.map((pin) => (
        <PinButton
          key={pin.commentId}
          pin={pin}
          selected={pin.commentId === selectedCommentId}
          onSelect={() => onSelect(pin.commentId)}
        />
      ))}
      {draftPoint ? <DraftPin point={draftPoint} /> : null}
    </div>
  );
}

/**
 * The whole media, turned into one target that reports where it was clicked.
 *
 * A button rather than a bare click handler so it is reachable by keyboard and
 * announced by a screen reader. A key press carries no coordinates, so it places
 * the pin at the center — the point a reviewer can then describe in words, and a
 * working path to a pinned comment for anyone not using a mouse.
 */
function PlacingSurface(props: { onPlace: (point: MediaPoint) => void }) {
  return (
    <button
      type="button"
      aria-label="Pick the spot to comment on"
      className="absolute inset-0 cursor-crosshair focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
          return;
        }
        // `detail` is 0 for a keyboard-triggered click, where clientX/Y are too.
        if (event.detail === 0) {
          props.onPlace({ x: 0.5, y: 0.5 });
          return;
        }
        props.onPlace({
          x: clamp((event.clientX - rect.left) / rect.width),
          y: clamp((event.clientY - rect.top) / rect.height),
        });
      }}
    />
  );
}

function PinButton(props: {
  pin: MediaPin;
  selected: boolean;
  onSelect: () => void;
}) {
  const { pin, selected, onSelect } = props;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`Comment ${pin.index}`}
      aria-pressed={selected}
      style={{ left: percent(pin.point.x), top: percent(pin.point.y) }}
      className={clsx(
        // The pin's bottom-left corner sits on the point, so the badge never
        // covers the pixel it is pointing at.
        "pointer-events-auto absolute -translate-y-full",
        "flex size-7 items-center justify-center rounded-full rounded-bl-none",
        "text-xs font-semibold tabular-nums shadow-md transition",
        "focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none",
        selected
          ? "bg-primary-solid scale-110 text-white"
          : "bg-app text-default hover:scale-110",
      )}
    >
      {pin.index}
    </button>
  );
}

/**
 * Where the comment being written will land. Deliberately not a number: it has
 * no place in the ordering until it is posted.
 */
function DraftPin(props: { point: MediaPoint }) {
  return (
    <div
      aria-hidden
      style={{ left: percent(props.point.x), top: percent(props.point.y) }}
      className="bg-primary-solid pointer-events-none absolute flex size-7 -translate-y-full animate-pulse items-center justify-center rounded-full rounded-bl-none text-white shadow-md"
    >
      <MessageSquareIcon className="size-3.5" />
    </div>
  );
}

function percent(value: number): string {
  return `${value * 100}%`;
}

function clamp(value: number): number {
  return Math.min(1, Math.max(0, value));
}
