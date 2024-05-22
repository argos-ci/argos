import { ForwardedRef, forwardRef } from "react";
import { clsx } from "clsx";
import { ChevronDownIcon } from "lucide-react";
import { Button, ButtonProps } from "react-aria-components";

export { Select } from "react-aria-components";

function SelectArrow() {
  return (
    <span aria-hidden="true">
      <ChevronDownIcon className="size-4" />
    </span>
  );
}

export const SelectButton = forwardRef(function SelectButton(
  {
    children,
    className,
    size = "md",
    ...props
  }: ButtonProps & {
    children: React.ReactNode;
    size?: "sm" | "md";
  },
  ref: ForwardedRef<HTMLButtonElement>,
) {
  return (
    <Button
      ref={ref}
      className={clsx(
        "bg-app text invalid:border-danger hover:border-hover focus:border-active disabled:opacity-disabled cursor-default appearance-none rounded border leading-tight focus:outline-none",
        "flex w-full items-center justify-between",
        {
          md: "gap-3 px-3 py-2 text-base",
          sm: "gap-2 px-2 py-1 text-sm",
        }[size],
        className,
      )}
      {...props}
    >
      {children}
      <SelectArrow />
    </Button>
  );
});
