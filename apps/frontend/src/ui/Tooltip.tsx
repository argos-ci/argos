"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { clsx } from "clsx";

type TooltipVariant = "default" | "info";

const variantClassNames: Record<TooltipVariant, string> = {
  default: "text-xxs py-1 px-2",
  info: "text-sm p-2 [&_strong]:font-medium",
};

export const TooltipProvider = TooltipPrimitive.Provider;

export type TooltipProps = {
  content: React.ReactNode;
  children: React.ReactNode;
  variant?: TooltipVariant;
  side?: TooltipPrimitive.TooltipContentProps["side"];
  align?: TooltipPrimitive.TooltipContentProps["align"];
  preventPointerDownOutside?: boolean;
  disableHoverableContent?: boolean;
};

export const TooltipTrigger = TooltipPrimitive.Trigger;
export const TooltipRoot = TooltipPrimitive.Root;
export const TooltipContent = React.forwardRef(
  (
    {
      className,
      variant = "default",
      ...props
    }: TooltipPrimitive.TooltipContentProps & {
      variant?: TooltipVariant;
    },
    ref: React.ForwardedRef<HTMLDivElement>,
  ) => {
    const variantClassName = variantClassNames[variant];
    return (
      <TooltipPrimitive.Content
        ref={ref}
        sideOffset={4}
        {...props}
        className={clsx(
          "bg-subtle text z-50 overflow-hidden rounded-md border shadow-md",
          "animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          variantClassName,
          className,
        )}
      />
    );
  },
);

export const Tooltip = ({
  children,
  variant = "default",
  content,
  align,
  side,
  disableHoverableContent = true,
  preventPointerDownOutside,
}: TooltipProps) => {
  if (!content) return <>{children}</>;
  return (
    <TooltipRoot disableHoverableContent={disableHoverableContent}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipPrimitive.Portal>
        <TooltipContent
          sideOffset={4}
          align={align}
          side={side}
          variant={variant}
          onPointerDownOutside={(event) => {
            if (preventPointerDownOutside) {
              event.preventDefault();
            }
          }}
        >
          {content}
        </TooltipContent>
      </TooltipPrimitive.Portal>
    </TooltipRoot>
  );
};
