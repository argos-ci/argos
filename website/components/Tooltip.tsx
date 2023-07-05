import React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

export type TooltipProps = {
  content: React.ReactNode;
  children: React.ReactNode;
};

export const TooltipProvider = TooltipPrimitive.Provider;

export const Tooltip = ({ children, content }: TooltipProps) => {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Content
        sideOffset={4}
        className="z-50 overflow-hidden rounded-md border bg-tooltip-bg px-3 py-1.5 text-sm text-tooltip-on shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
      >
        {content}
        <TooltipPrimitive.Arrow width={11} height={5} />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Root>
  );
};
