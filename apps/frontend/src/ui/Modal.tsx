import * as React from "react";
import { clsx } from "clsx";
import {
  ModalOverlay,
  ModalOverlayProps,
  ModalRenderProps,
  Modal as RACModal,
} from "react-aria-components";

const overlayStyles = (props: ModalRenderProps) =>
  clsx(
    "fixed top-0 left-0 w-full h-[--visual-viewport-height] isolate z-20 bg-black/15 flex items-center justify-center p-4 text-center backdrop-blur-lg",
    props.isEntering && "animate-in fade-in duration-200 ease-out",
    props.isExiting && "animate-out fade-out duration-200 ease-in",
  );

const modalStyles = (props: ModalRenderProps) =>
  clsx(
    "overflow-hidden max-h-[calc(100vh-4rem)] max-w-[calc(100vw-4rem)] rounded-2xl bg-app dark:backdrop-blur-2xl dark:backdrop-saturate-200 forced-colors:bg-[Canvas] text-left align-middle text-sm shadow-2xl bg-clip-padding dark:border",
    props.isEntering && "animate-in zoom-in-105 ease-out duration-200",
    props.isExiting && "animate-out zoom-out-95 ease-in duration-200",
  );

export type { ModalOverlayProps };

export function Modal(props: ModalOverlayProps) {
  return (
    <ModalOverlay {...props} className={overlayStyles}>
      <RACModal {...props} className={modalStyles} />
    </ModalOverlay>
  );
}
