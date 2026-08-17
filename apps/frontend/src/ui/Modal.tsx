import {
  createContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { clsx } from "clsx";

import { OverlayContentProvider, useOverlayRoot } from "./Overlay";
import { useEventCallback } from "./useEventCallback";

const backdropClassName = clsx(
  "fixed inset-0 z-dialog bg-black/15 backdrop-blur-lg",
  "data-open:animate-in data-open:fade-in data-open:duration-200 data-open:ease-out",
  "data-closed:animate-out data-closed:fade-out data-closed:duration-200 data-closed:ease-in",
);

// `h-dvh` where react-aria measured `--visual-viewport-height` with a script:
// the dynamic viewport unit tracks the same mobile-keyboard resizes natively.
const viewportClassName =
  "fixed top-0 left-0 isolate z-dialog flex h-dvh w-full items-center justify-center p-4 text-center";

const popupClassName = clsx(
  "bg-app max-h-[calc(100vh-4rem)] max-w-[calc(100vw-4rem)] overflow-hidden rounded-2xl bg-clip-padding text-left align-middle text-sm shadow-2xl outline-none dark:border dark:backdrop-blur-2xl dark:backdrop-saturate-200 forced-colors:bg-[Canvas]",
  // Grows in from slightly small. Deliberately no fade: the card must stay
  // opaque for every frame it is on screen, or the page shows through it —
  // which is exactly what a screenshot taken mid-entrance caught. The
  // backdrop behind it does the fading.
  "data-open:animate-in data-open:zoom-in-95 data-open:duration-200 data-open:ease-out",
  // Fades as it shrinks — react-aria tore the card out on the animation's
  // last frame, so the missing fade never showed; Base UI keeps it mounted a
  // beat longer, and a card that only scales visibly pops out at the end.
  // Safe on the way out, where nothing is left to see through it.
  "data-closed:animate-out data-closed:fade-out data-closed:zoom-out-95 data-closed:duration-200 data-closed:ease-in data-closed:fill-mode-forwards",
);

interface ActionContextValue {
  isPending: boolean;
  setIsPending: (isPending: boolean) => void;
}

export const ModalActionContext = createContext<ActionContextValue | null>(
  null,
);

export type ModalProps = {
  children: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /**
   * Whether clicking the backdrop dismisses the dialog. Escape always does —
   * unless an action is pending, which blocks every user dismissal.
   */
  dismissible?: boolean;
};

export function Modal(props: ModalProps) {
  const { children, dismissible = false, ...stateProps } = props;
  const { state, renderTrigger } = useOverlayRoot(stateProps);
  const [isPending, setIsPending] = useState(false);
  // A fresh open starts un-pending. Reset on the way in — the state outlives
  // the popup, and resetting on close would re-enable the dialog's content
  // while the exit animation still shows it.
  const [prevOpen, setPrevOpen] = useState(state.isOpen);
  if (state.isOpen !== prevOpen) {
    setPrevOpen(state.isOpen);
    if (state.isOpen) {
      setIsPending(false);
    }
  }
  const setIsPendingSafe = useEventCallback((next: boolean) => {
    // An action that settles after the dialog started closing must not
    // re-enable its content mid-exit.
    if (!next && !state.isOpen) {
      return;
    }
    setIsPending(next);
  });
  const actionContextValue = useMemo<ActionContextValue>(
    () => ({ isPending, setIsPending: setIsPendingSafe }),
    [isPending, setIsPendingSafe],
  );
  const popupRef = useRef<HTMLDivElement>(null);

  return (
    <ModalActionContext.Provider value={actionContextValue}>
      <BaseDialog.Root
        open={state.isOpen}
        onOpenChange={(next, details) => {
          // Only user dismissals arrive here — Escape, the backdrop, the
          // trigger. While an action is pending they are refused; the app's
          // own `close()` drives the state directly and stays allowed.
          if (!next && isPending) {
            details.cancel();
            return;
          }
          state.setOpen(next);
        }}
        disablePointerDismissal={isPending || !dismissible}
        modal
      >
        {renderTrigger?.((element) => (
          <BaseDialog.Trigger render={element} />
        ))}
        <BaseDialog.Portal>
          <BaseDialog.Backdrop className={backdropClassName} />
          <BaseDialog.Viewport className={viewportClassName}>
            {/* `data-modal` is load-bearing: the build hotkeys treat any event
                from inside it as belonging to the dialog. The dialog role
                itself lives on `Dialog`, as it always has — `presentation`
                keeps the popup from being a second one. */}
            <BaseDialog.Popup
              ref={popupRef}
              role="presentation"
              data-modal=""
              // Focus lands on the dialog itself, as it did on react-aria —
              // Base UI's default keeps it on the trigger for pointer opens,
              // which leaves a modal the keyboard is not inside of.
              initialFocus={popupRef}
              className={popupClassName}
            >
              <OverlayContentProvider state={state}>
                {children}
              </OverlayContentProvider>
            </BaseDialog.Popup>
          </BaseDialog.Viewport>
        </BaseDialog.Portal>
      </BaseDialog.Root>
    </ModalActionContext.Provider>
  );
}
