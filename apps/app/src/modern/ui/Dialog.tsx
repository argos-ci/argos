import { XMarkIcon } from "@heroicons/react/24/solid";
import {
  Dialog as AriakitDialog,
  DialogDismiss as AriakitDialogDismiss,
  DialogOptions,
  useDialogState,
} from "ariakit/dialog";
import { clsx } from "clsx";
import { forwardRef } from "react";

import { IconButton } from "./IconButton";

export { useDialogState };

export interface DialogHeaderProps {
  children: React.ReactNode;
}

export const DialogHeader = forwardRef<HTMLDivElement, DialogHeaderProps>(
  ({ children }, ref) => {
    return (
      <div
        ref={ref}
        className="flex items-center justify-between border-b border-b-tooltip-border p-4"
      >
        {children}
      </div>
    );
  }
);

export interface DialogBodyProps {
  children: React.ReactNode;
  className?: string;
}

export const DialogBody = forwardRef<HTMLDivElement, DialogBodyProps>(
  ({ children, className }, ref) => {
    return (
      <div ref={ref} className={clsx(className, "p-4")}>
        {children}
      </div>
    );
  }
);

export interface DialogTitleProps {
  children: React.ReactNode;
}

export const DialogTitle = forwardRef<HTMLHeadingElement, DialogTitleProps>(
  ({ children }, ref) => {
    return (
      <h2 ref={ref} className="text-lg font-medium">
        {children}
      </h2>
    );
  }
);

export const DialogDismiss = forwardRef<
  HTMLButtonElement,
  Record<string, never>
>((_props, ref) => {
  return (
    <AriakitDialogDismiss ref={ref}>
      {(dialogDismissProps) => (
        <IconButton {...dialogDismissProps} color="neutral">
          <XMarkIcon />
        </IconButton>
      )}
    </AriakitDialogDismiss>
  );
});

export interface DialogProps extends DialogOptions {
  children: React.ReactNode;
}

export const Dialog = forwardRef<HTMLDivElement, DialogProps>(
  ({ children, ...props }, ref) => {
    return (
      <AriakitDialog
        ref={ref}
        className="bordered absolute top-[50%] left-[50%] z-50 max-h-[calc(100vh-4rem)] max-w-[calc(100vw-4rem)] translate-x-[-50%] translate-y-[-50%] flex-col overflow-auto rounded-lg border border-tooltip-border bg-tooltip-bg text-sm shadow-md"
        {...props}
      >
        {children}
      </AriakitDialog>
    );
  }
);
