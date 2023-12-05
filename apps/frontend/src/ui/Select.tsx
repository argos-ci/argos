import { CheckIcon } from "lucide-react";
import {
  Select as AriakitSelect,
  SelectArrow as AriakitSelectArrow,
  SelectArrowProps as AriakitSelectArrowProps,
  SelectItem as AriakitSelectItem,
  SelectItemProps as AriakitSelectItemProps,
  SelectPopover as AriakitSelectPopover,
  SelectPopoverProps as AriakitSelectPopoverProps,
  SelectProps as AriakitSelectProps,
  SelectSeparator as AriakitSelectSeparator,
  SelectSeparatorProps as AriakitSelectSeparatorProps,
} from "ariakit/select";
import { clsx } from "clsx";
import { forwardRef } from "react";

export { useSelectState } from "ariakit/select";

export const SelectSeparator = forwardRef<
  HTMLHRElement,
  Omit<AriakitSelectSeparatorProps, "className">
>((props, ref) => {
  return (
    <AriakitSelectSeparator
      ref={ref}
      className="-mx-1 my-1 border-t"
      {...props}
    />
  );
});

export const Select = forwardRef<
  HTMLButtonElement,
  AriakitSelectProps & {
    size?: "sm" | "md";
  }
>(({ className, size = "md", ...props }, ref) => {
  return (
    <AriakitSelect
      ref={ref}
      className={clsx(
        "flex appearance-none items-center gap-2 rounded border bg-app leading-tight text invalid:border-danger hover:border-hover focus:border-active focus:outline-none disabled:opacity-disabled cursor-default",
        {
          md: "px-3 py-2 text-base",
          sm: "px-2 py-1 text-sm",
        }[size],
        className,
      )}
      {...props}
    />
  );
});

export const SelectArrow = forwardRef<HTMLSpanElement, AriakitSelectArrowProps>(
  (props, ref) => {
    return <AriakitSelectArrow ref={ref} {...props} />;
  },
);

export const SelectPopover = forwardRef<
  HTMLDivElement,
  AriakitSelectPopoverProps
>(({ className, ...props }, ref) => {
  return (
    <AriakitSelectPopover
      ref={ref}
      as="div"
      className={clsx(
        className,
        "z-50 max-h-[--popover-available-height] min-w-[--popover-anchor-width] overflow-auto rounded-lg border bg-subtle p-1 focus:outline-none",
      )}
      {...props}
    />
  );
});

export const SelectItem = forwardRef<
  HTMLDivElement,
  AriakitSelectItemProps & {
    button?: boolean;
  }
>(({ children, button = false, className, ...props }, ref) => {
  return (
    <AriakitSelectItem
      ref={ref}
      className={clsx(
        className,
        "group/item",
        "flex select-none items-center gap-2 rounded px-3 py-1.5 text-sm text transition hover:bg-active focus:bg-active focus:outline-none aria-disabled:opacity-disabled",
      )}
      value={button ? "" : props.value}
      {...props}
    >
      <>
        {!button && (
          <CheckIcon className="h-4 w-4 text opacity-0 group-aria-selected/item:opacity-100" />
        )}
        {children}
      </>
    </AriakitSelectItem>
  );
});
