import { forwardRef } from "react";
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
import { CheckIcon } from "lucide-react";

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
        "bg-app text invalid:border-danger hover:border-hover focus:border-active disabled:opacity-disabled flex cursor-default appearance-none items-center gap-2 rounded border leading-tight focus:outline-none",
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
        "bg-subtle z-50 max-h-[--popover-available-height] min-w-[--popover-anchor-width] overflow-auto rounded-lg border p-1 focus:outline-none",
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
        "text hover:bg-active focus:bg-active aria-disabled:opacity-disabled flex select-none items-center gap-2 rounded px-3 py-1.5 text-sm transition focus:outline-none",
      )}
      value={button ? "" : props.value}
      {...props}
    >
      <>
        {!button && (
          <CheckIcon className="text size-4 opacity-0 group-aria-selected/item:opacity-100" />
        )}
        {children}
      </>
    </AriakitSelectItem>
  );
});
