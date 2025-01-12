import { cloneElement, useRef } from "react";
import { clsx } from "clsx";
import { FocusableOptions, mergeProps, useFocusable } from "react-aria";
import {
  Tooltip as RACTooltip,
  TooltipProps as RACTooltipProps,
  TooltipRenderProps,
  TooltipTrigger,
  TooltipTriggerComponentProps,
} from "react-aria-components";

type TooltipVariant = "default" | "info";

const variantClassNames: Record<TooltipVariant, string> = {
  default: clsx("text-xxs py-1 px-2 max-w-sm"),
  info: "text-sm p-2 [&_strong]:font-medium",
};

export type TooltipProps = {
  content: React.ReactNode;
  children: React.ReactElement<FocusableOptions>;
  variant?: TooltipVariant;
  placement?: RACTooltipProps["placement"];
  disableHoverableContent?: boolean;
  isOpen?: TooltipTriggerComponentProps["isOpen"];
  onOpenChange?: TooltipTriggerComponentProps["onOpenChange"];
};

export function getTooltipAnimationClassName(
  props: TooltipRenderProps,
): string {
  return clsx(
    "fill-mode-forwards",
    props.placement &&
      clsx(
        {
          bottom: "origin-top",
          top: "origin-bottom",
          left: "origin-right",
          right: "origin-left",
          center: "origin-center",
        }[props.placement],
        props.isEntering &&
          clsx(
            "animate-in fade-in",
            {
              bottom: "slide-in-from-top-1",
              top: "slide-in-from-bottom-1",
              left: "slide-in-from-right-1",
              right: "slide-in-from-left-1",
              center: "",
            }[props.placement],
          ),
        props.isExiting &&
          clsx(
            "animate-out fade-out zoom-out-95",
            {
              bottom: "slide-out-to-top-1",
              top: "slide-out-to-bottom-1",
              left: "slide-out-to-right-1",
              right: "slide-out-to-left-1",
              center: "",
            }[props.placement],
          ),
      ),
  );
}

type TooltipOverlayProps = RACTooltipProps & {
  ref?: React.Ref<HTMLDivElement>;
  variant?: TooltipVariant;
  disableHoverableContent?: boolean;
  children: React.ReactNode;
};

function TooltipOverlay({
  className,
  variant = "default",
  disableHoverableContent = true,
  children,
  ...props
}: TooltipOverlayProps) {
  const variantClassName = variantClassNames[variant];
  const frozenChildrenRef = useRef(children);
  return (
    <RACTooltip
      offset={4}
      {...props}
      className={(props) =>
        clsx(
          "bg-subtle text overflow-hidden rounded-md border shadow-md",
          disableHoverableContent && "pointer-events-none",
          getTooltipAnimationClassName(props),
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
}

function TooltipTarget(props: {
  children: React.ReactElement<FocusableOptions>;
}) {
  const triggerRef = useRef(null);
  const { focusableProps } = useFocusable(props.children.props, triggerRef);

  return cloneElement(
    props.children,
    mergeProps(focusableProps, { tabIndex: 0 }, props.children.props, {
      ref: triggerRef,
    }),
  );
}

export function Tooltip(props: TooltipProps) {
  if (!props.content) {
    return props.children;
  }
  return (
    <TooltipTrigger
      delay={900}
      closeDelay={100}
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
