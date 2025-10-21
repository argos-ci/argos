import { clsx } from "clsx";
import { SeparatorProps, useSeparator } from "react-aria";

export function Separator(
  props: SeparatorProps & {
    className?: string;
  },
) {
  const { separatorProps } = useSeparator(props);
  return (
    <div
      {...separatorProps}
      className={clsx(
        "shrink-0 bg-(--border-color-default)",
        props.orientation === "vertical" ? "w-px" : "h-px w-full",
        props.className,
      )}
    />
  );
}
