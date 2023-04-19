import {
  Tooltip as AriakitTooltip,
  TooltipAnchor as AriakitTooltipAnchor,
  TooltipStateProps,
  useTooltipState as useAriakitTooltipState,
} from "ariakit/tooltip";
import type {
  TooltipAnchorProps as AriakitTooltipAnchorProps,
  TooltipProps as AriakitTooltipProps,
} from "ariakit/tooltip";
import { clsx } from "clsx";
import {
  Children,
  cloneElement,
  forwardRef,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import { useEventCallback } from "./useEventCallback";

const useTooltipState = (props?: TooltipStateProps) =>
  useAriakitTooltipState({ timeout: 800, ...props });

type TooltipAnchorProps = AriakitTooltipAnchorProps;
const TooltipAnchor = AriakitTooltipAnchor;

export type TooltipVariant = "default" | "info";

type TooltipProps = {
  variant?: TooltipVariant | undefined;
} & AriakitTooltipProps<"div">;

const variantClassNames: Record<TooltipVariant, string> = {
  default: "text-xs py-1 px-2 text-danger-500",
  info: "text-sm p-2 [&_strong]:font-medium",
};

const Tooltip = forwardRef<HTMLDivElement, TooltipProps>(
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

export type MagicTooltipProps = {
  tooltip: React.ReactNode;
  variant?: TooltipVariant;
  children: React.ReactElement;
  timeout?: number;
} & Omit<TooltipAnchorProps, "children" | "state">;

type ActiveMagicTooltipProps = MagicTooltipProps & {
  focusRef: React.MutableRefObject<boolean>;
  hoverRef: React.MutableRefObject<boolean>;
  timeout?: number;
};

const ActiveMagicTooltip = forwardRef<HTMLDivElement, ActiveMagicTooltipProps>(
  (props, ref) => {
    const {
      tooltip,
      children,
      hoverRef,
      focusRef,
      variant,
      timeout,
      ...restProps
    } = props;
    const state = useTooltipState({ timeout });
    const { render, show } = state;
    useLayoutEffect(() => {
      if (hoverRef.current || focusRef.current) {
        render();
        show();
      }
    }, [render, show, hoverRef, focusRef]);

    return (
      <>
        <TooltipAnchor ref={ref} state={state} {...restProps}>
          {(referenceProps) => cloneElement(children, referenceProps)}
        </TooltipAnchor>
        <Tooltip state={state} variant={variant}>
          {tooltip}
        </Tooltip>
      </>
    );
  }
);

export const MagicTooltip = forwardRef<HTMLDivElement, MagicTooltipProps>(
  ({ children, ...props }, ref) => {
    const [active, setActive] = useState(false);
    const hoverRef = useRef(false);
    const handleMouseEnter = useEventCallback(
      (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        props.onMouseEnter?.(event);
        hoverRef.current = true;
        setActive(true);
      }
    );
    const handleMouseLeave = useEventCallback(
      (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        props.onMouseLeave?.(event);
        hoverRef.current = false;
      }
    );
    const focusRef = useRef(false);
    const handleFocus = useEventCallback(
      (event: React.FocusEvent<HTMLDivElement>) => {
        props.onFocus?.(event);
        focusRef.current = true;
        setActive(true);
      }
    );
    const handleBlur = useEventCallback(
      (event: React.FocusEvent<HTMLDivElement>) => {
        props.onBlur?.(event);
        focusRef.current = false;
      }
    );

    const child = Children.only(children);
    if (!props.tooltip) {
      return cloneElement(child, props);
    }
    if (!active) {
      const childProps = {
        ...props,
        ref,
        onMouseEnter: handleMouseEnter,
        onMouseLeave: handleMouseLeave,
        onFocus: handleFocus,
        onBlur: handleBlur,
      } as Record<string, any>;
      if (typeof props.tooltip === "string" && !child.props["aria-label"]) {
        childProps["aria-label"] = props["aria-label"] ?? props.tooltip;
      }
      return cloneElement(child, childProps);
    }

    return (
      <ActiveMagicTooltip {...props} hoverRef={hoverRef} focusRef={focusRef}>
        {child}
      </ActiveMagicTooltip>
    );
  }
);
