import { clsx } from "clsx";
import { SeparatorProps, useSeparator } from "react-aria";

export function Separator(
  props: SeparatorProps & {
    className?: string;
  },
) {
  const { separatorProps } = useSeparator(props);
  console.log(separatorProps);
  return (
    <div
      {...separatorProps}
      className={clsx(
        "bg-border shrink-0",
        props.orientation === "vertical" ? "h-full w-px" : "h-px w-full",
        props.className,
      )}
    />
  );
}
