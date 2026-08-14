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

type TooltipPayload = {
  content: React.ReactNode;
  variant: TooltipVariant;
  side: BaseTooltip.Positioner.Props["side"];
  align: BaseTooltip.Positioner.Props["align"];
};

/**
 * One tooltip, shared by every trigger that does not need its own.
 *
 * Triggers attach by handle and hand their content over as a payload, so moving
 * the pointer from one to the next animates the same element across instead of
 * tearing one down and building another. A tooltip per trigger — which is what
 * react-aria did — restarts the animation every time, and along a row of icon
 * buttons that reads as flicker.
 */
const tooltipHandle = BaseTooltip.createHandle<TooltipPayload>();

function TooltipSurface(props: {
  payload: TooltipPayload;
  disableAnimation?: boolean;
}) {
  const { payload, disableAnimation = false } = props;
  return (
    <BaseTooltip.Portal>
      <BaseTooltip.Positioner
        side={payload.side}
        align={payload.align}
        sideOffset={4}
        className={clsx(
          !disableAnimation && [
            // Sizing the positioner to the popup is what lets the box travel
            // and resize together rather than jumping.
            "h-(--positioner-height) w-(--positioner-width) max-w-(--available-width)",
          ],
        )}
      >
        <BaseTooltip.Popup
          className={clsx(
            "bg-app text-default overflow-hidden rounded-md border-thin shadow-sm/8",
            variantClassNames[payload.variant],
            !disableAnimation && [
              "h-(--popup-height,auto) w-(--popup-width,auto)",
              // Base UI publishes the origin for the resolved side, so the
              // per-placement `origin-*` map the react-aria version carried is
              // no longer needed.
              "origin-(--transform-origin) fill-mode-forwards",
              // The same `tailwindcss-animate` keyframes as before the
              // migration, keyed off `data-open`/`data-closed` rather than
              // react-aria's `isEntering`/`isExiting`.
              "data-open:animate-in data-open:fade-in",
              "data-closed:animate-out data-closed:fade-out data-closed:zoom-out-95",
              "data-[side=bottom]:data-open:slide-in-from-top-1",
              "data-[side=top]:data-open:slide-in-from-bottom-1",
              "data-[side=left]:data-open:slide-in-from-right-1",
              "data-[side=right]:data-open:slide-in-from-left-1",
              "data-[side=bottom]:data-closed:slide-out-to-top-1",
              "data-[side=top]:data-closed:slide-out-to-bottom-1",
              "data-[side=left]:data-closed:slide-out-to-right-1",
              "data-[side=right]:data-closed:slide-out-to-left-1",
              // Deliberately no `data-instant:animate-none`: Base UI sets
              // `data-instant` for every open after the first in a group, and
              // honouring it meant the tooltip simply appeared with no
              // animation at all for most of the row.
            ],
          )}
        >
          {/* Cross-fades the text when the tooltip moves between triggers,
              rather than swapping it in one frame. */}
          <BaseTooltip.Viewport
            className={clsx(
              "relative h-full w-full",
              !disableAnimation &&
                "**:data-previous:absolute **:data-previous:inset-0 **:data-previous:opacity-0 **:data-previous:transition-opacity **:data-current:transition-opacity",
            )}
          >
            {payload.content}
          </BaseTooltip.Viewport>
        </BaseTooltip.Popup>
      </BaseTooltip.Positioner>
    </BaseTooltip.Portal>
  );
}

export function TooltipProvider(props: { children: React.ReactNode }) {
  return (
    <BaseTooltip.Provider
      delay={TOOLTIP_DELAY}
      closeDelay={TOOLTIP_CLOSE_DELAY}
    >
      {props.children}
      {/* Only tooltips keeping the default `disableHoverableContent` ride this
          one, so it opts out too — which is also what marks the positioner
          `inert`, and so what stops the tooltip eating a click aimed at the
          button under it. */}
      <BaseTooltip.Root handle={tooltipHandle} disableHoverablePopup>
        {({ payload }) =>
          payload ? <TooltipSurface payload={payload} /> : null
        }
      </BaseTooltip.Root>
    </BaseTooltip.Provider>
  );
}

export type TooltipProps = {
  content: React.ReactNode;
  children: ReactElement;
  variant?: TooltipVariant;
  side?: BaseTooltip.Positioner.Props["side"];
  align?: BaseTooltip.Positioner.Props["align"];
  /**
   * Let the pointer move onto the tooltip itself, for content holding a link.
   * Such a tooltip cannot ride the shared one, so it gets a root of its own.
   */
  disableHoverableContent?: boolean;
  disableAnimation?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /**
   * Override how long the pointer must rest before this tooltip opens.
   *
   * Base UI reads delays from a provider rather than from the tooltip, so
   * setting this gives the tooltip a provider of its own — which also takes it
   * out of the shared group. Leave it alone unless the tooltip really should
   * behave differently from every other one.
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

  const payload: TooltipPayload = { content, variant, side, align };

  // Anything that must behave differently from the rest — a controlled open
  // state, its own delay, or hoverable content — cannot ride the shared
  // tooltip, whose root is mounted once for the whole app.
  const needsOwnRoot =
    open !== undefined ||
    onOpenChange !== undefined ||
    delay !== undefined ||
    closeDelay !== undefined ||
    !disableHoverableContent;

  if (!needsOwnRoot) {
    return (
      <BaseTooltip.Trigger
        handle={tooltipHandle}
        payload={payload}
        render={children}
      />
    );
  }

  const ownRoot = (
    <BaseTooltip.Root
      open={open}
      onOpenChange={onOpenChange}
      disableHoverablePopup={disableHoverableContent}
    >
      <BaseTooltip.Trigger render={children} />
      <TooltipSurface payload={payload} disableAnimation={disableAnimation} />
    </BaseTooltip.Root>
  );

  if (delay === undefined && closeDelay === undefined) {
    return ownRoot;
  }
  return (
    <BaseTooltip.Provider
      delay={delay ?? TOOLTIP_DELAY}
      closeDelay={closeDelay ?? TOOLTIP_CLOSE_DELAY}
    >
      {ownRoot}
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
