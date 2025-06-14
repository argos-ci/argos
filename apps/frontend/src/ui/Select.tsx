import { clsx } from "clsx";
import { ChevronDownIcon } from "lucide-react";
import {
  Select as AriaSelect,
  Button,
  ButtonProps,
  type SelectProps as AriaSelectSelectProps,
} from "react-aria-components";

function SelectArrow() {
  return (
    <span aria-hidden="true">
      <ChevronDownIcon className="size-4" />
    </span>
  );
}

export interface SelectProps
  extends AriaSelectSelectProps,
    React.RefAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical";
}

export function Select(props: SelectProps) {
  const { orientation = "vertical", ...rest } = props;
  return (
    <AriaSelect
      {...rest}
      className={clsx(
        "group/select flex gap-2",
        {
          horizontal: "items-center",
          vertical: "flex-col",
        }[orientation],
        props.className,
      )}
    />
  );
}

export function SelectButton({
  children,
  size = "md",
  ...rest
}: ButtonProps & {
  ref?: React.Ref<HTMLButtonElement>;
  children: React.ReactNode;
  size?: "sm" | "md";
}) {
  return (
    <Button
      {...rest}
      className={clsx(
        /* Appearance */
        "bg-app cursor-default appearance-none rounded-sm border leading-tight",
        /* Layout */
        "flex items-center justify-between",
        /* Focus */
        "group-data-[focused]/select:border-active group-data-[focused]/select:outline-hidden",
        /* Hover */
        "data-[hovered]:border-hover",
        /* Disabled */
        "group-data-[disabled]/select:opacity-disabled group-data-[disabled]/select:cursor-not-allowed",
        /* Invalid */
        "group-data-[invalid]/select:border-danger group-data-[invalid]/select:group-data-[focused]/select:border-danger-active group-data-[invalid]/select:data-[hovered]:border-danger-hover",
        {
          md: "gap-2 px-3 py-2 text-base",
          sm: "gap-2 px-2 py-1 text-sm",
        }[size],
        rest.className,
      )}
    >
      {children}
      <SelectArrow />
    </Button>
  );
}
