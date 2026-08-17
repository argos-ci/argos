import { useRef, type ReactNode } from "react";
import { Popover as BasePopover } from "@base-ui/react/popover";
import { clsx } from "clsx";
import {
  PopoverProps as RACPopoverProps,
  PopoverRenderProps,
  Popover as RACPopover,
} from "react-aria-components";

import { OverlayContentProvider, useOverlayRoot } from "./Overlay";
import {
  popupAnimationClassName,
  popupSurfaceClassName,
  popupZIndexClassName,
} from "./popupSurface";

/**
 * A small floating layer opened from a trigger.
 *
 * Reads its open state and its trigger from the `DialogTrigger` above it, or
 * owns it when given `open`/`onOpenChange` — a context menu positions against
 * an `anchor` ref instead of a trigger.
 */
export function Popover(props: {
  children?: ReactNode;
  side?: BasePopover.Positioner.Props["side"];
  align?: BasePopover.Positioner.Props["align"];
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** What the popup positions against, when the trigger is not a pressable. */
  anchor?: React.RefObject<Element | null>;
  className?: string;
}) {
  const {
    children,
    side = "bottom",
    // Centered, as react-aria's default `placement="bottom"` was.
    align = "center",
    anchor,
    className,
    ...stateProps
  } = props;
  const { state, renderTrigger } = useOverlayRoot(stateProps);
  const popupRef = useRef<HTMLDivElement>(null);
  return (
    <BasePopover.Root
      open={state.isOpen}
      onOpenChange={(next) => state.setOpen(next)}
    >
      {renderTrigger?.((element) => (
        <BasePopover.Trigger render={element} />
      ))}
      <BasePopover.Portal>
        <BasePopover.Positioner
          side={side}
          align={align}
          sideOffset={4}
          anchor={anchor}
          className={clsx(popupZIndexClassName, "max-w-(--available-width)")}
        >
          {/* The dialog role belongs to the `Dialog` rendered inside, exactly
              as it did on react-aria — this surface is just its frame. */}
          <BasePopover.Popup
            ref={popupRef}
            role="presentation"
            // As on react-aria: focus moves into the popover when it opens,
            // whatever opened it.
            initialFocus={popupRef}
            className={clsx(
              popupSurfaceClassName,
              popupAnimationClassName,
              "flex-col outline-none",
              className,
            )}
          >
            <OverlayContentProvider state={state}>
              {children}
            </OverlayContentProvider>
          </BasePopover.Popup>
        </BasePopover.Positioner>
      </BasePopover.Portal>
    </BasePopover.Root>
  );
}

/* -------------------------------------------------------------------------- */
/* The react-aria popover, kept for Select                                    */
/* -------------------------------------------------------------------------- */

/**
 * Where the pop-in animation grows from: the corner touching the trigger.
 *
 * The render values only carry the resolved *side* ("bottom"), not the
 * requested alignment — so an end-aligned menu used to zoom from its top
 * center, visibly detached from the button that opened it. The alignment is
 * read back from the `placement` prop, while the side comes from the render
 * values so a flipped popover still animates from the right edge.
 */
function getPopoverOriginClassName(
  side: PopoverRenderProps["placement"],
  requestedPlacement: RACPopoverProps["placement"],
): string | null {
  const alignment = requestedPlacement?.split(" ")[1];
  switch (side) {
    case "bottom":
      return {
        start: "origin-top-left",
        end: "origin-top-right",
        default: "origin-top",
      }[alignment ?? "default"]!;
    case "top":
      return {
        start: "origin-bottom-left",
        end: "origin-bottom-right",
        default: "origin-bottom",
      }[alignment ?? "default"]!;
    case "left":
      return "origin-right";
    case "right":
      return "origin-left";
    case "center":
      return "origin-center";
    default:
      return null;
  }
}

function getPopoverAnimationClassName(
  values: PopoverRenderProps,
  requestedPlacement: RACPopoverProps["placement"],
): string {
  return clsx(
    "fill-mode-forwards",
    getPopoverOriginClassName(values.placement, requestedPlacement),
    // Mirrors the exit: without the zoom the menu just fades in mid-air
    // instead of growing out of its trigger.
    values.isEntering && "animate-in fade-in zoom-in-95",
    values.isExiting && "animate-out fade-out zoom-out-95",
  );
}

/**
 * The react-aria popover `Select` still opens — it reads the select's state
 * from context, which Base UI's popover cannot. It dies with `ListBox` when
 * Select moves to Base UI.
 */
export function SelectPopover(
  props: RACPopoverProps & {
    ref?: React.Ref<HTMLDivElement>;
  },
) {
  return (
    <RACPopover
      offset={4}
      {...props}
      className={(values) =>
        clsx(
          popupSurfaceClassName,
          popupZIndexClassName,
          getPopoverAnimationClassName(values, props.placement),
          props.className,
        )
      }
    />
  );
}
