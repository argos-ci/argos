import { CheckIcon } from "@heroicons/react/24/outline";
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
export type { SelectState } from "ariakit/select";

export type SelectSeparatorProps = Omit<
  AriakitSelectSeparatorProps,
  "className"
>;

export const SelectSeparator = forwardRef<HTMLHRElement, SelectSeparatorProps>(
  (props, ref) => {
    return (
      <AriakitSelectSeparator
        ref={ref}
        className="-mx-1 my-1 border-t"
        {...props}
      />
    );
  },
);

export type SelectProps = AriakitSelectProps & {
  size?: "sm" | "md";
};

export const Select = forwardRef<HTMLButtonElement, SelectProps>(
  ({ className, size = "md", ...props }, ref) => {
    return (
      <AriakitSelect
        ref={ref}
        className={clsx(
          "flex appearance-none items-center gap-2 rounded border bg-app leading-tight text invalid:border-danger hover:border-hover focus:border-active focus:outline-none disabled:opacity-disabled",
          {
            md: "px-3 py-2 text-base",
            sm: "px-2 py-1 text-sm",
          }[size],
          className,
        )}
        {...props}
      />
    );
  },
);

export const SelectArrow = forwardRef<HTMLSpanElement, AriakitSelectArrowProps>(
  (props, ref) => {
    return <AriakitSelectArrow ref={ref} {...props} />;
  },
);

export type SelectPopoverProps = AriakitSelectPopoverProps;

export const SelectPopover = forwardRef<HTMLDivElement, SelectPopoverProps>(
  ({ className, ...props }, ref) => {
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
  },
);

export type SelectItemProps = AriakitSelectItemProps & {
  button?: boolean;
};

export const SelectItem = forwardRef<HTMLDivElement, SelectItemProps>(
  ({ children, button = false, className, ...props }, ref) => {
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
  },
);

export const SelectText = (props: { children: React.ReactNode }) => {
  return (
    <>
      <SelectSeparator />
      <div className="px-2 py-1.5 text-xs text-low">{props.children}</div>
    </>
  );
};
