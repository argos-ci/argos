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
        className="-mx-1 my-1 border-t border-t-menu-border"
        {...props}
      />
    );
  }
);

export type SelectProps = AriakitSelectProps;

export const Select = forwardRef<HTMLButtonElement, SelectProps>(
  ({ className, ...props }, ref) => {
    return (
      <AriakitSelect
        ref={ref}
        className={clsx(
          className,
          "focus:shadow-outline flex appearance-none items-center gap-2 rounded border border-border bg-slate-900 px-3 py-2 leading-tight text-on shadow invalid:border-red-800 focus:outline-none disabled:opacity-disabled"
        )}
        {...props}
      />
    );
  }
);

export const SelectArrow = forwardRef<HTMLSpanElement, AriakitSelectArrowProps>(
  (props, ref) => {
    return <AriakitSelectArrow ref={ref} {...props} />;
  }
);

export type SelectPopoverProps = Omit<AriakitSelectPopoverProps, "className">;

export const SelectPopover = forwardRef<HTMLDivElement, SelectProps>(
  (props, ref) => {
    return (
      <AriakitSelectPopover
        ref={ref}
        as="div"
        className="z-50 min-w-[var(--popover-anchor-width)] rounded-lg border border-menu-border bg-menu-bg p-1 focus:outline-none"
        {...props}
      />
    );
  }
);

export type SelectItemProps = Omit<AriakitSelectItemProps, "className">;

export const SelectItem = forwardRef<HTMLDivElement, SelectItemProps>(
  (props, ref) => {
    return (
      <AriakitSelectItem
        ref={ref}
        className={clsx(
          "flex select-none items-center rounded px-3 py-1.5 text-sm text-menu-on transition hover:bg-menu-item-hover-bg hover:text-menu-hover-on focus:bg-menu-item-hover-bg focus:outline-none aria-disabled:opacity-70"
        )}
        {...props}
      />
    );
  }
);

export const SelectText = (props: { children: React.ReactNode }) => {
  return (
    <>
      <SelectSeparator />
      <div className="px-2 py-1.5 text-xs text-menu-on-title">
        {props.children}
      </div>
    </>
  );
};
