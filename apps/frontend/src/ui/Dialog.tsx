import { forwardRef, useContext } from "react";
import { clsx } from "clsx";
import {
  Heading,
  OverlayTriggerStateContext,
  Dialog as RACDialog,
  DialogProps as RACDialogProps,
} from "react-aria-components";

import { Button, ButtonProps } from "./Button";

export { DialogTrigger } from "react-aria-components";

export const DialogHeader = forwardRef<
  HTMLDivElement,
  {
    children: React.ReactNode;
  }
>(({ children }, ref) => {
  return (
    <div ref={ref} className="flex items-center justify-between border-b p-4">
      {children}
    </div>
  );
});

export const DialogFooter = forwardRef<
  HTMLDivElement,
  {
    children: React.ReactNode;
  }
>(({ children }, ref) => {
  return (
    <div
      ref={ref}
      className="bg-subtle flex items-center justify-end gap-4 border-t p-4"
    >
      {children}
    </div>
  );
});

export const DialogText = forwardRef<
  HTMLDivElement,
  {
    children: React.ReactNode;
    className?: string;
  }
>(({ children, className }, ref) => {
  return (
    <p ref={ref} className={clsx("my-4", className)}>
      {children}
    </p>
  );
});

export const DialogBody = forwardRef<
  HTMLDivElement,
  {
    children: React.ReactNode;
    className?: string;
    confirm?: boolean;
  }
>(({ children, className, confirm }, ref) => {
  return (
    <div ref={ref} className={clsx("p-4", confirm && "text-center", className)}>
      {children}
    </div>
  );
});

export const DialogTitle = forwardRef<
  HTMLHeadingElement,
  {
    children: React.ReactNode;
  }
>(({ children }, ref) => {
  return (
    <Heading ref={ref} slot="title" className="text-xl font-medium">
      {children}
    </Heading>
  );
});

export function useOverlayTriggerState() {
  return useContext(OverlayTriggerStateContext);
}

export const DialogDismiss = forwardRef<
  HTMLButtonElement,
  {
    children: React.ReactNode;
    onPress?: ButtonProps["onPress"];
    single?: boolean;
  }
>((props, ref) => {
  const state = useOverlayTriggerState();
  return (
    <Button
      ref={ref}
      className={props.single ? "flex-1 justify-center" : undefined}
      variant="secondary"
      onPress={(event) => {
        props.onPress?.(event);
        state.close();
      }}
      autoFocus
    >
      {props.children}
    </Button>
  );
});

type DialogProps = RACDialogProps & {
  size?: "auto" | "medium";
};

export const Dialog = forwardRef<HTMLDivElement, DialogProps>(
  ({ className, size = "auto", ...props }, ref) => {
    return (
      <RACDialog
        ref={ref}
        className={clsx(
          className,
          "relative max-h-[inherit] overflow-auto",
          size === "medium" && "w-[36rem]",
        )}
        {...props}
      />
    );
  },
);
