"use client";

import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { clsx } from "clsx";
import * as React from "react";

export type TooltipVariant = "default" | "info";

const variantClassNames: Record<TooltipVariant, string> = {
  default: "text-xxs py-1 px-2",
  info: "text-sm p-2 [&_strong]:font-medium",
};

export type TooltipProps = {
  content: React.ReactNode;
  children: React.ReactNode;
  variant?: TooltipVariant;
  side?: TooltipPrimitive.TooltipContentProps["side"];
  align?: TooltipPrimitive.TooltipContentProps["align"];
};

export const TooltipProvider = TooltipPrimitive.Provider;

export const Tooltip = ({
  children,
  variant = "default",
  content,
  align,
  side,
}: TooltipProps) => {
  const variantClassName = variantClassNames[variant];
  if (!variantClassName) {
    throw new Error(`Invalid variant: ${variant}`);
  }
  if (!content) return <>{children}</>;
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          sideOffset={4}
          align={align}
          side={side}
          className={clsx(
            "z-50 overflow-hidden rounded-md border bg-subtle text shadow-md",
            "animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
            variantClassName
          )}
        >
          {content}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
};
