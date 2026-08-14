import { Separator as BaseSeparator } from "@base-ui/react/separator";
import { clsx } from "clsx";

export function Separator(
  props: BaseSeparator.Props & {
    className?: string;
  },
) {
  const { className, orientation = "horizontal", ...rest } = props;
  return (
    <BaseSeparator
      {...rest}
      orientation={orientation}
      className={clsx(
        "shrink-0 bg-(--border-color-default)",
        orientation === "vertical" ? "w-px" : "h-px w-full",
        className,
      )}
    />
  );
}
