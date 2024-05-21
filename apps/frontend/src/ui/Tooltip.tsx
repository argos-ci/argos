import * as React from "react";
import { clsx } from "clsx";
import { mergeProps, useFocusable } from "react-aria";
import {
  Tooltip as RACTooltip,
  TooltipProps as RACTooltipProps,
  TooltipRenderProps,
  TooltipTrigger,
  TooltipTriggerComponentProps,
} from "react-aria-components";

type TooltipVariant = "default" | "info";

const variantClassNames: Record<TooltipVariant, string> = {
  default: "text-xxs py-1 px-2",
  info: "text-sm p-2 [&_strong]:font-medium",
};

export type TooltipProps = {
  content: React.ReactNode;
  children: React.ReactElement;
  variant?: TooltipVariant;
  placement?: RACTooltipProps["placement"];
  disableHoverableContent?: boolean;
  isOpen?: TooltipTriggerComponentProps["isOpen"];
  onOpenChange?: TooltipTriggerComponentProps["onOpenChange"];
};

const tooltipStyles = (props: TooltipRenderProps) =>
  clsx(
    props.isEntering &&
      "animate-in fade-in zoom-in-95 data-[placement=bottom]:slide-in-from-top-1 data-[placement=top]:slide-in-from-bottom-1 data-[placement=left]:slide-in-from-right-1 data-[placement=right]:slide-in-from-left-1",
    props.isExiting &&
      "animate-out fade-out zoom-out-95 data-[placement=bottom]:slide-out-to-top-1 data-[placement=top]:slide-out-to-bottom-1 data-[placement=left]:slide-out-to-right-1 data-[placement=right]:slide-out-to-left-1",
  );

type TooltipOverlayProps = RACTooltipProps & {
  variant?: TooltipVariant;
  disableHoverableContent?: boolean;
  children: React.ReactNode;
};

const TooltipOverlay = React.forwardRef(
  (
    {
      className,
      variant = "default",
      disableHoverableContent = true,
      children,
      ...props
    }: TooltipOverlayProps,
    ref: React.ForwardedRef<HTMLDivElement>,
  ) => {
    const variantClassName = variantClassNames[variant];
    const frozenChildrenRef = React.useRef(children);
    return (
      <RACTooltip
        ref={ref}
        offset={4}
        {...props}
        className={(props) =>
          clsx(
            "bg-subtle text z-50 overflow-hidden rounded-md border shadow-md",
            disableHoverableContent && "pointer-events-none",
            tooltipStyles(props),
            variantClassName,
            className,
          )
        }
      >
        {(values) => {
          // Freeze the children while the tooltip is animating.
          if (!values.isEntering && !values.isExiting) {
            frozenChildrenRef.current = children;
            return children;
          }

          return frozenChildrenRef.current;
        }}
      </RACTooltip>
    );
  },
);

function TooltipTarget(props: { children: React.ReactElement }) {
  const triggerRef = React.useRef(null);
  const { focusableProps } = useFocusable(props.children.props, triggerRef);

  return React.cloneElement(
    props.children,
    mergeProps(focusableProps, { tabIndex: 0 }, props.children.props, {
      ref: triggerRef,
    }),
  );
}

export function Tooltip(props: TooltipProps) {
  return (
    <TooltipTrigger
      delay={900}
      closeDelay={100}
      isDisabled={!props.content}
      isOpen={props.isOpen}
      onOpenChange={props.onOpenChange}
    >
      <TooltipTarget>{props.children}</TooltipTarget>
      <TooltipOverlay
        variant={props.variant}
        placement={props.placement}
        disableHoverableContent={props.disableHoverableContent}
      >
        {props.content}
      </TooltipOverlay>
    </TooltipTrigger>
  );
}
