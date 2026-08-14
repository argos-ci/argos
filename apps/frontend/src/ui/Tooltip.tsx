import { type ComponentPropsWithRef, type ReactElement } from "react";
import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import { clsx } from "clsx";
import type { LucideIcon } from "lucide-react";

type TooltipVariant = "default" | "info";

const variantClassNames: Record<TooltipVariant, string> = {
  default: clsx("text-xs py-1 px-2 max-w-sm"),
  // Same measure as `default`: without it a paragraph of content stretches to
  // whatever the viewport allows.
  info: "text-sm p-2 max-w-sm [&_strong]:font-medium",
};

/**
 * How long the pointer must rest before a tooltip opens, and how long one stays
 * up after it leaves. Base UI reads these from a provider rather than per
 * tooltip, which is also what gives a group of tooltips its warm-up: once one
 * has opened, the next opens immediately.
 */
const TOOLTIP_DELAY = 900;
const TOOLTIP_CLOSE_DELAY = 100;

export function TooltipProvider(props: { children: React.ReactNode }) {
  return (
    <BaseTooltip.Provider
      delay={TOOLTIP_DELAY}
      closeDelay={TOOLTIP_CLOSE_DELAY}
    >
      {props.children}
    </BaseTooltip.Provider>
  );
}

export type TooltipProps = {
  content: React.ReactNode;
  children: ReactElement;
  variant?: TooltipVariant;
  /** Which side of the trigger to sit on. Base UI's own prop, passed straight through. */
  side?: BaseTooltip.Positioner.Props["side"];
  align?: BaseTooltip.Positioner.Props["align"];
  disableHoverableContent?: boolean;
  disableAnimation?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /**
   * Override how long the pointer must rest before this tooltip opens.
   *
   * Base UI reads delays from a provider rather than from the tooltip, so
   * setting this gives the tooltip a provider of its own — which also takes it
   * out of the shared warm-up group. Leave it alone unless the tooltip really
   * should behave differently from every other one.
   */
  delay?: number;
  closeDelay?: number;
};

export function Tooltip(props: TooltipProps) {
  const {
    content,
    children,
    variant = "default",
    side,
    align,
    disableHoverableContent = true,
    disableAnimation = false,
    open,
    onOpenChange,
    delay,
    closeDelay,
  } = props;
  if (!content) {
    return children;
  }
  const tooltip = (
    <BaseTooltip.Root
      open={open}
      onOpenChange={onOpenChange}
      disableHoverablePopup={disableHoverableContent}
    >
      {/* `render` replaces react-aria's `useFocusable` + `FocusableProvider` +
          `mergeProps` + `cloneElement`: Base UI merges its own props and ref
          into whatever element it is given. */}
      <BaseTooltip.Trigger render={children} />
      <BaseTooltip.Portal>
        <BaseTooltip.Positioner side={side} align={align} sideOffset={4}>
          <BaseTooltip.Popup
            className={clsx(
              "bg-subtle text-default overflow-hidden rounded-md border shadow-md",
              // Keeps the tooltip from eating a click aimed at what is under
              // it; `disableHoverablePopup` only handles the safe polygon.
              disableHoverableContent && "pointer-events-none",
              variantClassNames[variant],
              !disableAnimation && [
                "origin-(--transform-origin) transition duration-150 ease-out",
                "data-starting-style:opacity-0 data-ending-style:opacity-0",
                "data-[side=bottom]:data-starting-style:-translate-y-1",
                "data-[side=top]:data-starting-style:translate-y-1",
                "data-[side=left]:data-starting-style:translate-x-1",
                "data-[side=right]:data-starting-style:-translate-x-1",
              ],
            )}
          >
            {content}
          </BaseTooltip.Popup>
        </BaseTooltip.Positioner>
      </BaseTooltip.Portal>
    </BaseTooltip.Root>
  );
  if (delay === undefined && closeDelay === undefined) {
    return tooltip;
  }
  return (
    <BaseTooltip.Provider
      delay={delay ?? TOOLTIP_DELAY}
      closeDelay={closeDelay ?? TOOLTIP_CLOSE_DELAY}
    >
      {tooltip}
    </BaseTooltip.Provider>
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
