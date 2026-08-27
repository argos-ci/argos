import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { clsx } from "clsx";

import { OverlayContentProvider } from "./Overlay";
import { useEventCallback } from "./useEventCallback";

const backdropClassName = clsx(
  "z-dialog fixed inset-0 bg-black/15 backdrop-blur-sm",
  "data-open:animate-in data-open:fade-in data-open:duration-200 data-open:ease-out",
  "data-closed:animate-out data-closed:fade-out data-closed:duration-200 data-closed:ease-in",
);

/** How far ahead (ms) a release projects its velocity to decide a dismissal. */
const VELOCITY_PROJECTION = 150;
/** How much of a rightward drag the panel follows — the rubber band. */
const OVERDRAG_DAMPING = 0.12;
/** Fraction of the panel width past which a release closes it. */
const DISMISS_FRACTION = 0.35;

/**
 * The `BottomSheet`'s sibling, sliding in from the left edge — for surfaces
 * that are a left sidebar on desktop, so the phone keeps the same geography.
 * Same Base UI primitives and overlay contract; the drag is horizontal and
 * either open or dismissed, with no intermediate snap. A gesture that starts
 * more vertical than horizontal is left to the content, which is how the list
 * inside keeps scrolling naturally.
 */
export function SideSheet(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  "aria-label": string;
  children: ReactNode;
  className?: string;
}) {
  const { open, onOpenChange } = props;
  const popupRef = useRef<HTMLDivElement>(null);
  const drag = useSideSheetDrag({ popupRef, open, onOpenChange });
  const overlayState = useMemo(
    () => ({
      isOpen: open,
      close: () => onOpenChange(false),
      setOpen: onOpenChange,
    }),
    [open, onOpenChange],
  );
  return (
    <BaseDialog.Root open={open} onOpenChange={onOpenChange} modal>
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className={backdropClassName} />
        <BaseDialog.Viewport className="z-dialog fixed inset-y-0 left-0 flex h-dvh flex-row justify-start">
          <BaseDialog.Popup
            ref={popupRef}
            aria-label={props["aria-label"]}
            // Same load-bearing marker as `Modal`: the build hotkeys treat
            // events from inside it as belonging to the dialog.
            data-modal=""
            initialFocus={popupRef}
            onTouchStart={drag.onTouchStart}
            onTouchEnd={drag.onTouchEnd}
            onTouchCancel={drag.onTouchEnd}
            className={clsx(
              "bg-app border-r-thin flex h-dvh w-[85vw] max-w-sm flex-row overflow-hidden overscroll-contain rounded-r-2xl pl-[env(safe-area-inset-left)] shadow-2xl outline-none",
              "data-open:animate-in data-open:slide-in-from-left data-open:duration-300 data-open:ease-out",
              "data-closed:animate-out data-closed:slide-out-to-left data-closed:duration-200 data-closed:ease-in data-closed:fill-mode-forwards",
              props.className,
            )}
          >
            <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
              <OverlayContentProvider state={overlayState}>
                {props.children}
              </OverlayContentProvider>
            </div>
            <button
              type="button"
              aria-label="Close"
              data-sheet-handle=""
              // `touch-action: none` so pointer events keep flowing during
              // the drag; taps still land as clicks.
              onPointerDown={drag.onHandlePointerDown}
              onClick={drag.onHandleClick}
              className="flex shrink-0 cursor-grab touch-none items-center px-2"
            >
              <span aria-hidden className="bg-hover h-10 w-1 rounded-full" />
            </button>
          </BaseDialog.Popup>
        </BaseDialog.Viewport>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}

/**
 * The horizontal drawer gesture. Mirrors `BottomSheet`'s `useSheetDrag`, with
 * one addition it does not need: an axis decision on the first move. The
 * panel hosts vertically scrolling content, so a gesture that starts more
 * vertical than horizontal is declined for the rest of the touch and native
 * scrolling proceeds; a horizontal one takes over immediately (deciding later
 * loses the gesture for good on iOS). Horizontally scrollable content (the
 * filter chips) keeps a leftward swipe while it still has somewhere to go.
 */
function useSideSheetDrag(options: {
  popupRef: React.RefObject<HTMLDivElement | null>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { popupRef, open, onOpenChange } = options;
  const state = useRef({
    startX: 0,
    startY: 0,
    startTime: 0,
    /** Raw offset while dragging, negative toward dismissal. */
    offset: 0,
    dragging: false,
    /** The first move was vertical: leave the whole touch to the content. */
    declined: false,
    moved: false,
    fromHandle: false,
    scrollable: null as HTMLElement | null,
    closing: false,
  });

  useEffect(() => {
    if (open) {
      const popup = popupRef.current;
      if (popup) {
        popup.style.transform = "";
        popup.style.transition = "";
        popup.style.animation = "";
      }
      state.current.closing = false;
      state.current.moved = false;
    }
  }, [open, popupRef]);

  const apply = useEventCallback((dx: number) => {
    const popup = popupRef.current;
    if (!popup) {
      return;
    }
    state.current.offset = dx;
    if (Math.abs(dx) > 5) {
      state.current.moved = true;
    }
    const shown = dx <= 0 ? dx : dx * OVERDRAG_DAMPING;
    popup.style.transition = "none";
    popup.style.transform = `translateX(${shown}px)`;
  });

  const settle = useEventCallback(() => {
    const popup = popupRef.current;
    const { offset, startTime } = state.current;
    state.current.dragging = false;
    if (!popup) {
      return;
    }
    const width = popup.offsetWidth;
    const elapsed = Math.max(1, performance.now() - startTime);
    const velocity = offset / elapsed;
    const projected = offset + velocity * VELOCITY_PROJECTION;
    if (projected < -width * DISMISS_FRACTION) {
      state.current.closing = true;
      popup.style.transition = "transform 200ms ease-in";
      popup.style.transform = "translateX(-100%)";
      // The slide-out keyframes would snap the panel back before animating;
      // the drag already played the exit, so mute them.
      popup.style.animation = "none";
      onOpenChange(false);
    } else {
      popup.style.transition =
        "transform 300ms cubic-bezier(0.32, 0.72, 0.25, 1)";
      popup.style.transform = "";
    }
  });

  // Attached manually because dismissing requires `preventDefault` on
  // `touchmove`, and React registers that listener as passive.
  const handleTouchMove = useEventCallback((event: TouchEvent) => {
    const current = state.current;
    const touch = event.touches[0];
    if (!touch || current.closing || current.declined) {
      return;
    }
    const dx = touch.clientX - current.startX;
    const dy = touch.clientY - current.startY;
    if (!current.dragging) {
      if (Math.abs(dx) < 2 && Math.abs(dy) < 2) {
        return;
      }
      if (!current.fromHandle) {
        if (Math.abs(dy) >= Math.abs(dx)) {
          current.declined = true;
          return;
        }
        const scrollable = current.scrollable;
        const scrollTakes =
          scrollable &&
          (dx < 0
            ? scrollable.scrollLeft <
              scrollable.scrollWidth - scrollable.clientWidth - 1
            : scrollable.scrollLeft > 0);
        if (scrollTakes) {
          current.declined = true;
          return;
        }
      }
      current.dragging = true;
      current.startX = touch.clientX;
      current.startTime = performance.now();
    }
    event.preventDefault();
    apply(touch.clientX - current.startX);
  });

  useEffect(() => {
    const popup = popupRef.current;
    if (!open || !popup) {
      return undefined;
    }
    popup.addEventListener("touchmove", handleTouchMove, { passive: false });
    return () => popup.removeEventListener("touchmove", handleTouchMove);
  }, [open, popupRef, handleTouchMove]);

  return {
    onHandlePointerDown: (event: React.PointerEvent<HTMLElement>) => {
      // Touch goes through the touch listeners; this path covers the mouse.
      if (event.pointerType !== "mouse") {
        return;
      }
      const target = event.currentTarget;
      target.setPointerCapture(event.pointerId);
      state.current = {
        ...state.current,
        startX: event.clientX,
        startTime: performance.now(),
        dragging: true,
        declined: false,
        moved: false,
        fromHandle: true,
        scrollable: null,
      };
      const onMove = (moveEvent: PointerEvent) => {
        apply(moveEvent.clientX - state.current.startX);
      };
      const onUp = () => {
        target.removeEventListener("pointermove", onMove);
        target.removeEventListener("pointerup", onUp);
        target.removeEventListener("pointercancel", onUp);
        settle();
      };
      target.addEventListener("pointermove", onMove);
      target.addEventListener("pointerup", onUp);
      target.addEventListener("pointercancel", onUp);
    },
    onHandleClick: () => {
      // A drag that settled releases over the handle and clicks it; only a
      // genuine tap closes.
      if (state.current.moved) {
        state.current.moved = false;
        return;
      }
      onOpenChange(false);
    },
    onTouchStart: (event: React.TouchEvent<HTMLElement>) => {
      const touch = event.touches[0];
      if (!touch) {
        return;
      }
      const targetElement =
        event.target instanceof HTMLElement ? event.target : null;
      state.current = {
        ...state.current,
        startX: touch.clientX,
        startY: touch.clientY,
        startTime: performance.now(),
        dragging: false,
        declined: false,
        moved: false,
        fromHandle: Boolean(targetElement?.closest("[data-sheet-handle]")),
        scrollable: findScrollableX(targetElement, popupRef.current),
      };
    },
    onTouchEnd: () => {
      if (state.current.dragging) {
        settle();
      }
    },
  };
}

/** The nearest ancestor that scrolls horizontally, stopping at the panel. */
function findScrollableX(
  element: HTMLElement | null,
  boundary: HTMLElement | null,
): HTMLElement | null {
  let node = element;
  while (node && node !== boundary) {
    const { overflowX } = getComputedStyle(node);
    if (
      (overflowX === "auto" || overflowX === "scroll") &&
      node.scrollWidth > node.clientWidth
    ) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}
