import { cloneElement, useRef, type ComponentPropsWithRef } from "react";
import { FocusableProvider } from "@react-aria/interactions";
import { clsx } from "clsx";
import type { LucideIcon } from "lucide-react";
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
  default: clsx("text-xs py-1 px-2 max-w-sm"),
  info: "text-sm p-2 [&_strong]:font-medium",
};

export type TooltipProps = {
  content: React.ReactNode;
  children: React.ReactElement<FocusableOptions>;
  variant?: TooltipVariant;
  placement?: RACTooltipProps["placement"];
  disableHoverableContent?: boolean;
  disableAnimation?: boolean;
  isOpen?: TooltipTriggerComponentProps["isOpen"];
  onOpenChange?: TooltipTriggerComponentProps["onOpenChange"];
  delay?: TooltipTriggerComponentProps["delay"];
  closeDelay?: TooltipTriggerComponentProps["closeDelay"];
};

function getTooltipAnimationClassName(props: TooltipRenderProps): string {
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
  disableAnimation?: boolean;
  children: React.ReactNode;
};

function TooltipOverlay({
  className,
  variant = "default",
  disableHoverableContent = true,
  disableAnimation = false,
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
          "bg-subtle text-default overflow-hidden rounded-md border shadow-md",
          disableHoverableContent && "pointer-events-none",
          !disableAnimation && getTooltipAnimationClassName(props),
          variantClassName,
          className,
        )
      }
    >
      {(values) => {
        const result = (() => {
          // Freeze the children while the tooltip is animating.
          if (!values.isEntering && !values.isExiting) {
            frozenChildrenRef.current = children;
            return children;
          }

          return frozenChildrenRef.current;
        })();

        return <FocusableProvider ref={null}>{result}</FocusableProvider>;
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
    // eslint-disable-next-line react-hooks/refs
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
      delay={props.delay ?? 900}
      closeDelay={props.closeDelay ?? 100}
      isOpen={props.isOpen}
      onOpenChange={props.onOpenChange}
    >
      <TooltipTarget>{props.children}</TooltipTarget>
      <TooltipOverlay
        variant={props.variant}
        placement={props.placement}
        disableHoverableContent={props.disableHoverableContent}
        disableAnimation={props.disableAnimation}
      >
        {props.content}
      </TooltipOverlay>
    </TooltipTrigger>
  );
}

export function TooltipContainer(props: ComponentPropsWithRef<"div">) {
  return (
    <div className="flex flex-col items-start gap-1 px-0.5 py-1" {...props} />
  );
}

export function TooltipHeader(
  props: ComponentPropsWithRef<"h3"> & {
    icon: LucideIcon;
  },
) {
  const { icon: Icon, ...rest } = props;
  return (
    <h3
      {...rest}
      className={clsx("mb-0.5 text-sm font-medium", rest.className)}
    >
      <Icon className="mr-1.5 inline size-3.5 align-middle opacity-70" />
      {props.children}
    </h3>
  );
}
