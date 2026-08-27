import { useEffect, useRef, type ReactNode } from "react";
import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { clsx } from "clsx";

import { useEventCallback } from "./useEventCallback";

const backdropClassName = clsx(
  "z-dialog fixed inset-0 bg-black/15 backdrop-blur-sm",
  "data-open:animate-in data-open:fade-in data-open:duration-200 data-open:ease-out",
  "data-closed:animate-out data-closed:fade-out data-closed:duration-200 data-closed:ease-in",
);

/** Past this fraction of the sheet's height, a release closes it. */
const CLOSE_DISTANCE_RATIO = 0.25;
/** A flick faster than this (px/ms) closes regardless of distance. */
const CLOSE_VELOCITY = 0.5;
/** How much of an upward drag the sheet follows — the rubber band. */
const UPWARD_DAMPING = 0.12;

/**
 * A modal panel sliding up from the bottom edge, for surfaces that are
 * sidebars on desktop. Built on the same Base UI primitives as `Modal` so
 * dismissal (Escape, backdrop) and focus behave the same — plus the drawer
 * gesture: drag down to dismiss, with a spring back under the threshold and
 * an elastic resistance upward.
 */
export function BottomSheet(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  "aria-label": string;
  children: ReactNode;
  /** Height class of the panel, e.g. `h-[85dvh]`. Defaults to content height. */
  className?: string;
}) {
  const { open, onOpenChange } = props;
  const popupRef = useRef<HTMLDivElement>(null);
  const drag = useSheetDrag({ popupRef, open, onOpenChange });
  return (
    <BaseDialog.Root open={open} onOpenChange={onOpenChange} modal>
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className={backdropClassName} />
        <BaseDialog.Viewport className="z-dialog fixed inset-x-0 top-0 flex h-dvh flex-col justify-end">
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
              "bg-app border-t-thin flex max-h-[92dvh] flex-col overflow-hidden rounded-t-2xl pb-[env(safe-area-inset-bottom)] shadow-2xl outline-none",
              "data-open:animate-in data-open:slide-in-from-bottom data-open:duration-300 data-open:ease-out",
              "data-closed:animate-out data-closed:slide-out-to-bottom data-closed:duration-200 data-closed:ease-in data-closed:fill-mode-forwards",
              props.className,
            )}
          >
            <button
              type="button"
              aria-label="Close"
              data-sheet-handle=""
              // `touch-action: none` so pointer events keep flowing during
              // the drag; taps still land as clicks.
              onPointerDown={drag.onHandlePointerDown}
              onClick={drag.onHandleClick}
              className="flex shrink-0 cursor-grab touch-none justify-center py-2"
            >
              <span aria-hidden className="bg-hover h-1 w-10 rounded-full" />
            </button>
            {props.children}
          </BaseDialog.Popup>
        </BaseDialog.Viewport>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}

/**
 * The drawer gesture, in two input flavours: pointer capture on the handle
 * (covers the mouse), and non-passive touch listeners on the whole panel so
 * a downward swipe dismisses from anywhere — unless it lands on a scrollable
 * that still has room to scroll up, which keeps native scrolling.
 */
function useSheetDrag(options: {
  popupRef: React.RefObject<HTMLDivElement | null>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { popupRef, open, onOpenChange } = options;
  const state = useRef({
    startY: 0,
    startTime: 0,
    offset: 0,
    dragging: false,
    moved: false,
    fromHandle: false,
    scrollable: null as HTMLElement | null,
    closing: false,
  });

  // A fresh open starts from a clean slate: the previous drag may have left
  // an inline transform or a muted exit animation behind.
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

  const apply = useEventCallback((dy: number) => {
    const popup = popupRef.current;
    if (!popup) {
      return;
    }
    const offset = dy >= 0 ? dy : dy * UPWARD_DAMPING;
    state.current.offset = offset;
    if (Math.abs(dy) > 5) {
      state.current.moved = true;
    }
    popup.style.transition = "none";
    popup.style.transform = `translateY(${offset}px)`;
  });

  const settle = useEventCallback(() => {
    const popup = popupRef.current;
    const { offset, startTime } = state.current;
    state.current.dragging = false;
    if (!popup) {
      return;
    }
    const elapsed = Math.max(1, performance.now() - startTime);
    const velocity = offset / elapsed;
    const shouldClose =
      offset > popup.offsetHeight * CLOSE_DISTANCE_RATIO ||
      (offset > 40 && velocity > CLOSE_VELOCITY);
    if (shouldClose) {
      state.current.closing = true;
      popup.style.transition = "transform 200ms ease-in";
      popup.style.transform = "translateY(100%)";
      // The slide-out keyframes would snap the sheet back up before
      // animating; the drag already played the exit, so mute them and let
      // Base UI unmount right away.
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
    if (!touch || current.closing) {
      return;
    }
    const dy = touch.clientY - current.startY;
    if (!current.dragging) {
      const scrolled = current.scrollable && current.scrollable.scrollTop > 0;
      const takesOver =
        current.fromHandle ||
        (dy > 6 && !scrolled) ||
        (dy < -6 && !current.scrollable);
      if (!takesOver) {
        return;
      }
      current.dragging = true;
      current.startY = touch.clientY;
      current.startTime = performance.now();
    }
    event.preventDefault();
    apply(touch.clientY - current.startY);
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
        startY: event.clientY,
        startTime: performance.now(),
        dragging: true,
        moved: false,
        fromHandle: true,
        scrollable: null,
      };
      const onMove = (moveEvent: PointerEvent) => {
        apply(moveEvent.clientY - state.current.startY);
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
      // A drag that sprang back releases over the handle and clicks it;
      // only a genuine tap closes.
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
        startY: touch.clientY,
        startTime: performance.now(),
        dragging: false,
        moved: false,
        fromHandle: Boolean(targetElement?.closest("[data-sheet-handle]")),
        scrollable: findScrollable(targetElement, popupRef.current),
      };
    },
    onTouchEnd: () => {
      if (state.current.dragging) {
        settle();
      }
    },
  };
}

/** The nearest ancestor that actually scrolls, stopping at the sheet. */
function findScrollable(
  element: HTMLElement | null,
  boundary: HTMLElement | null,
): HTMLElement | null {
  let node = element;
  while (node && node !== boundary) {
    const { overflowY } = getComputedStyle(node);
    if (
      (overflowY === "auto" || overflowY === "scroll") &&
      node.scrollHeight > node.clientHeight
    ) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}
