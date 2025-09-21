import { createContext, useMemo, useState } from "react";
import { clsx } from "clsx";
import {
  ModalOverlay,
  ModalOverlayProps,
  ModalRenderProps,
  Modal as RACModal,
} from "react-aria-components";

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

// For now we don't use this hook because it's automatic for forms in dialogs
// ---
// /**
//  * Hook to manage modal actions with pending state.
//  * Must be used within a Modal.
//  * @example
//  * const [isPending, startDialogAction] = useModalAction();
//  */
// export function useModalAction() {
//   const context = use(ModalActionContext);
//   if (!context) {
//     throw new Error("useModalAction must be used within a Modal");
//   }
//   const startDialogAction = (action: () => Promise<void>) => {
//     context.setIsPending(true);
//     return action().finally(() => {
//       context.setIsPending(false);
//     });
//   };
//   return [context.isPending, startDialogAction] as const;
// }

export type ModalProps = ModalOverlayProps;

export function Modal(props: ModalProps) {
  const { children, ...rest } = props;
  const [isPending, setIsPending] = useState(false);
  const actionContextValue = useMemo(
    () => ({ isPending, setIsPending }),
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
          {children}
        </RACModal>
      </ModalOverlay>
    </ModalActionContext.Provider>
  );
}
