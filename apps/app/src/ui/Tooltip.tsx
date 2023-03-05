import {
  Tooltip as AriakitTooltip,
  TooltipAnchor as AriakitTooltipAnchor,
  useTooltipState as useAriakitTooltipState,
} from "ariakit/tooltip";
import type {
  TooltipProps as AriakitTooltipProps,
  TooltipAnchorOptions,
} from "ariakit/tooltip";
import { clsx } from "clsx";
import { Children, cloneElement, forwardRef } from "react";

export const useTooltipState = () => useAriakitTooltipState({ timeout: 800 });

export interface TooltipAnchorProps extends TooltipAnchorOptions<"div"> {
  children: React.ReactElement;
}

export const TooltipAnchor = forwardRef<HTMLDivElement, TooltipAnchorProps>(
  ({ children, ...props }, ref) => {
    return (
      <AriakitTooltipAnchor ref={ref} {...props}>
        {(anchorProps) => cloneElement(Children.only(children), anchorProps)}
      </AriakitTooltipAnchor>
    );
  }
);

export type TooltipVariant = "default" | "info";

export interface TooltipProps extends AriakitTooltipProps<"div"> {
  variant?: TooltipVariant | undefined;
}

const variantClassNames: Record<TooltipVariant, string> = {
  default: "text-xxs py-1 px-2",
  info: "text-sm p-2 [&_strong]:font-medium",
};

export const Tooltip = forwardRef<HTMLDivElement, TooltipProps>(
  ({ variant = "default", ...props }, ref) => {
    const variantClassName = variantClassNames[variant];
    if (!variantClassName) {
      throw new Error(`Invalid variant: ${variant}`);
    }
    return (
      <AriakitTooltip
        ref={ref}
        className={clsx(
          variantClassName,
          "z-50 rounded border border-tooltip-border bg-tooltip-bg text-tooltip-on"
        )}
        {...props}
      />
    );
  }
);

export interface MagicTooltipProps {
  tooltip: React.ReactNode;
  variant?: TooltipVariant;
  children: React.ReactElement;
}

export const MagicTooltip = forwardRef<HTMLDivElement, MagicTooltipProps>(
  ({ tooltip, variant, children }, ref) => {
    const state = useTooltipState();

    if (!tooltip) {
      return <div ref={ref}>{children}</div>;
    }

    return (
      <>
        <TooltipAnchor ref={ref} state={state}>
          {children}
        </TooltipAnchor>
        <Tooltip state={state} variant={variant}>
          {tooltip}
        </Tooltip>
      </>
    );
  }
);
