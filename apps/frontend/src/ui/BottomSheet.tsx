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

/** Fraction of the sheet still visible at the intermediate snap. */
const HALF_SNAP_VISIBLE = 0.55;
/** How far ahead (ms) a release projects its velocity to pick a snap. */
const VELOCITY_PROJECTION = 150;
/** How much of an upward drag the sheet follows — the rubber band. */
const UPWARD_DAMPING = 0.12;

/**
 * A modal panel sliding up from the bottom edge, for surfaces that are
 * sidebars on desktop. Built on the same Base UI primitives as `Modal` so
 * dismissal (Escape, backdrop) and focus behave the same — plus the drawer
 * gesture: grab it anywhere to drag it between full height, half height and
 * closed, with velocity deciding borderline releases, an elastic resistance
 * above full height, and native scrolling preserved inside content that has
 * somewhere to scroll.
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
  // The same overlay contract as `Modal` / `Popover`, so content written for
  // a dialog (`useOverlayTriggerState().close()`) works unchanged in a sheet.
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
              "bg-app border-t-thin flex max-h-[92dvh] flex-col overflow-hidden overscroll-contain rounded-t-2xl pb-[env(safe-area-inset-bottom)] shadow-2xl outline-none",
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
            <OverlayContentProvider state={overlayState}>
              {props.children}
            </OverlayContentProvider>
          </BaseDialog.Popup>
        </BaseDialog.Viewport>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}

/**
 * The drawer gesture, in two input flavours: pointer capture on the handle
 * (covers the mouse), and non-passive touch listeners on the whole panel.
 *
 * The touch side takes over on the very first `touchmove` — deciding later
 * loses the gesture for good on iOS, where a scrollable at its top starts
 * rubber-banding and then ignores `preventDefault` for the rest of the
 * gesture. Content scrolling wins only at full height, on a scrollable with
 * somewhere to go.
 */
function useSheetDrag(options: {
  popupRef: React.RefObject<HTMLDivElement | null>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { popupRef, open, onOpenChange } = options;
  const state = useRef({
    /** Offset of the current resting snap, from full height. */
    base: 0,
    startY: 0,
    startTime: 0,
    /** Raw offset while dragging: base plus the finger's travel. */
    offset: 0,
    dragging: false,
    moved: false,
    fromHandle: false,
    scrollable: null as HTMLElement | null,
    closing: false,
  });

  // A fresh open starts from a clean slate: the previous drag may have left
  // an inline transform, a resting snap or a muted exit animation behind.
  useEffect(() => {
    if (open) {
      const popup = popupRef.current;
      if (popup) {
        popup.style.transform = "";
        popup.style.transition = "";
        popup.style.animation = "";
      }
      state.current.base = 0;
      state.current.closing = false;
      state.current.moved = false;
    }
  }, [open, popupRef]);

  const apply = useEventCallback((dy: number) => {
    const popup = popupRef.current;
    if (!popup) {
      return;
    }
    const raw = state.current.base + dy;
    state.current.offset = raw;
    if (Math.abs(dy) > 5) {
      state.current.moved = true;
    }
    const shown = raw >= 0 ? raw : raw * UPWARD_DAMPING;
    popup.style.transition = "none";
    popup.style.transform = `translateY(${shown}px)`;
  });

  const settle = useEventCallback(() => {
    const popup = popupRef.current;
    const { offset, base, startTime } = state.current;
    state.current.dragging = false;
    if (!popup) {
      return;
    }
    const height = popup.offsetHeight;
    const snaps = [0, height * (1 - HALF_SNAP_VISIBLE), height];
    const elapsed = Math.max(1, performance.now() - startTime);
    const velocity = (offset - base) / elapsed;
    const projected = offset + velocity * VELOCITY_PROJECTION;
    const target = snaps.reduce((best, snap) =>
      Math.abs(snap - projected) < Math.abs(best - projected) ? snap : best,
    );
    if (target === height) {
      state.current.closing = true;
      popup.style.transition = "transform 200ms ease-in";
      popup.style.transform = "translateY(100%)";
      // The slide-out keyframes would snap the sheet back up before
      // animating; the drag already played the exit, so mute them and let
      // Base UI unmount right away.
      popup.style.animation = "none";
      onOpenChange(false);
    } else {
      state.current.base = target;
      popup.style.transition =
        "transform 300ms cubic-bezier(0.32, 0.72, 0.25, 1)";
      popup.style.transform = target === 0 ? "" : `translateY(${target}px)`;
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
      if (Math.abs(dy) < 2) {
        return;
      }
      const atFull = current.base === 0;
      const scrolledAway =
        atFull && current.scrollable && current.scrollable.scrollTop > 0;
      const takesOver =
        current.fromHandle ||
        !atFull ||
        (!scrolledAway && (dy > 0 || !current.scrollable));
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
