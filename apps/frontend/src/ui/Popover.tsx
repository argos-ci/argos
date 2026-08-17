import { useRef, type ReactNode } from "react";
import { Popover as BasePopover } from "@base-ui/react/popover";
import { clsx } from "clsx";

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
