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
        "bg-app text-default invalid:border-danger hover:border-hover focus:border-active disabled:opacity-disabled focus:outline-hidden cursor-default appearance-none rounded-sm border leading-tight",
        "flex items-center justify-between",
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
