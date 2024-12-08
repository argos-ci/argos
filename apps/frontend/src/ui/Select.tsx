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
        "bg-app text invalid:border-danger hover:border-hover focus:border-active disabled:opacity-disabled cursor-default appearance-none rounded border leading-tight focus:outline-none",
        "flex w-full items-center justify-between",
        {
          md: "gap-3 px-3 py-2 text-base",
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
