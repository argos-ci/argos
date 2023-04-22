import { XMarkIcon } from "@heroicons/react/24/solid";
import {
  Dialog as AriakitDialog,
  DialogDismiss as AriakitDialogDismiss,
  DialogOptions,
} from "ariakit/dialog";
import { clsx } from "clsx";
import { forwardRef } from "react";

import { Button } from "./Button";
import { IconButton } from "./IconButton";

export { useDialogState } from "ariakit/dialog";
export type { DialogState } from "ariakit/dialog";

export type DialogHeaderProps = {
  children: React.ReactNode;
};

export const DialogHeader = forwardRef<HTMLDivElement, DialogHeaderProps>(
  ({ children }, ref) => {
    return (
      <div
        ref={ref}
        className="flex items-center justify-between border-b border-b-dialog-border p-4"
      >
        {children}
      </div>
    );
  }
);

export type DialogFooterProps = {
  children: React.ReactNode;
};

export const DialogFooter = forwardRef<HTMLDivElement, DialogFooterProps>(
  ({ children }, ref) => {
    return (
      <div
        ref={ref}
        className="flex items-center justify-end gap-4 border-t border-t-dialog-border p-4"
      >
        {children}
      </div>
    );
  }
);

export type DialogTextProps = {
  children: React.ReactNode;
  className?: string;
};

export const DialogText = forwardRef<HTMLDivElement, DialogTextProps>(
  ({ children, className }, ref) => {
    return (
      <p ref={ref} className={clsx(className, "my-4 text-on-light")}>
        {children}
      </p>
    );
  }
);

export type DialogBodyProps = {
  children: React.ReactNode;
  className?: string;
  confirm?: boolean;
};

export const DialogBody = forwardRef<HTMLDivElement, DialogBodyProps>(
  ({ children, className, confirm }, ref) => {
    return (
      <div
        ref={ref}
        className={clsx(className, confirm && "text-center", "p-4")}
      >
        {children}
      </div>
    );
  }
);

export type DialogTitleProps = {
  children: React.ReactNode;
};

export const DialogTitle = forwardRef<HTMLHeadingElement, DialogTitleProps>(
  ({ children }, ref) => {
    return (
      <h2 ref={ref} className="text-lg font-medium">
        {children}
      </h2>
    );
  }
);

type DialogDismissProps = {
  children?: React.ReactNode;
};

export const DialogDismiss = forwardRef<HTMLButtonElement, DialogDismissProps>(
  (props, ref) => {
    return (
      <AriakitDialogDismiss ref={ref}>
        {(dialogDismissProps) =>
          props.children ? (
            <Button {...dialogDismissProps} color="neutral" variant="outline">
              {props.children}
            </Button>
          ) : (
            <IconButton {...dialogDismissProps} color="neutral">
              <XMarkIcon />
            </IconButton>
          )
        }
      </AriakitDialogDismiss>
    );
  }
);

export type DialogProps = DialogOptions & {
  children: React.ReactNode;
};

export const Dialog = forwardRef<HTMLDivElement, DialogProps>(
  ({ children, ...props }, ref) => {
    return (
      <AriakitDialog
        ref={ref}
        className="bordered absolute left-[50%] top-[50%] z-50 max-h-[calc(100vh-4rem)] max-w-[calc(100vw-4rem)] translate-x-[-50%] translate-y-[-50%] flex-col overflow-auto rounded-lg border border-dialog-border bg-dialog-bg text-sm shadow-md"
        {...props}
      >
        {children}
      </AriakitDialog>
    );
  }
);
