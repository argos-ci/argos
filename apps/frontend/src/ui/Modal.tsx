import {
  createContext,
  use,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { clsx } from "clsx";
import {
  ModalOverlay,
  ModalOverlayProps,
  ModalRenderProps,
  OverlayTriggerStateContext,
  Modal as RACModal,
} from "react-aria-components";

import { useEventCallback } from "./useEventCallback";

const overlayStyles = (props: ModalRenderProps) =>
  clsx(
    "fixed top-0 left-0 w-full h-(--visual-viewport-height) isolate z-dialog bg-black/15 flex items-center justify-center p-4 text-center backdrop-blur-lg",
    props.isEntering && "animate-in fade-in duration-200 ease-out",
    props.isExiting && "animate-out fade-out duration-200 ease-in",
  );

const modalStyles = (props: ModalRenderProps) =>
  clsx(
    "overflow-hidden max-h-[calc(100vh-4rem)] max-w-[calc(100vw-4rem)] rounded-2xl bg-app dark:backdrop-blur-2xl dark:backdrop-saturate-200 forced-colors:bg-[Canvas] text-left align-middle text-sm shadow-2xl bg-clip-padding dark:border",
    props.isEntering && "animate-in zoom-in-105 ease-out duration-200",
    props.isExiting && "animate-out zoom-out-95 ease-in duration-200",
  );

interface ActionContextValue {
  isPending: boolean;
  setIsPending: (isPending: boolean) => void;
}

export const ModalActionContext = createContext<ActionContextValue | null>(
  null,
);

export type ModalProps = ModalOverlayProps;

export function Modal(props: ModalProps) {
  const { children, ...rest } = props;
  const [isPending, setIsPending] = useState(false);
  // Once the dialog close has been requested while pending, we keep the modal
  // pending while it's closing: resetting the state would re-enable its
  // content during the exit animation.
  const closeRequestedRef = useRef(false);
  const actionContextValue: ActionContextValue = useMemo(
    () => ({
      isPending,
      setIsPending: (isPending) => {
        if (!isPending && closeRequestedRef.current) {
          return;
        }
        setIsPending(isPending);
      },
    }),
    [isPending],
  );
  const isDismissable = isPending ? false : props.isDismissable;
  return (
    <ModalActionContext.Provider value={actionContextValue}>
      <ModalOverlay
        {...rest}
        className={overlayStyles}
        isDismissable={isDismissable}
        isKeyboardDismissDisabled={isPending}
      >
        <RACModal
          data-modal=""
          className={modalStyles}
          isDismissable={isDismissable}
          isKeyboardDismissDisabled={isPending}
        >
          {(renderProps) => (
            <ModalCloseTracker
              onOpen={() => {
                closeRequestedRef.current = false;
                setIsPending(false);
              }}
              onCloseRequested={() => {
                closeRequestedRef.current = true;
              }}
            >
              {typeof children === "function"
                ? children(renderProps)
                : children}
            </ModalCloseTracker>
          )}
        </RACModal>
      </ModalOverlay>
    </ModalActionContext.Provider>
  );
}

/**
 * Intercept close requests made through the overlay trigger state (Dialog
 * render prop `close`, `DialogDismiss`, `useOverlayTriggerState().close()`)
 * so the Modal knows the dialog is closing.
 */
function ModalCloseTracker(props: {
  onOpen: () => void;
  onCloseRequested: () => void;
  children: React.ReactNode;
}) {
  const state = use(OverlayTriggerStateContext);
  const onOpen = useEventCallback(props.onOpen);
  const onCloseRequested = useEventCallback(props.onCloseRequested);
  // The tracker mounts each time the modal opens and stays mounted during the
  // exit animation, so mounting marks a fresh dialog session.
  useEffect(() => {
    onOpen();
  }, [onOpen]);
  const wrappedState = useMemo(() => {
    if (!state) {
      return state;
    }
    return {
      ...state,
      setOpen: (isOpen: boolean) => {
        if (!isOpen) {
          onCloseRequested();
        }
        state.setOpen(isOpen);
      },
      close: () => {
        onCloseRequested();
        state.close();
      },
      toggle: () => {
        if (state.isOpen) {
          onCloseRequested();
        }
        state.toggle();
      },
    };
  }, [state, onCloseRequested]);
  return (
    <OverlayTriggerStateContext.Provider value={wrappedState}>
      {props.children}
    </OverlayTriggerStateContext.Provider>
  );
}
