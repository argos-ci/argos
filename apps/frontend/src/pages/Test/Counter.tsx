import { type ComponentProps } from "react";
import clsx from "clsx";

export function Counter(props: ComponentProps<"div">) {
  return (
    <div
      {...props}
      className="flex flex-col items-center gap-0.5 px-2 select-none"
    />
  );
}

export function CounterLabel(props: ComponentProps<"div">) {
  return (
    <div
      {...props}
      className={clsx(
        "text-low text-xs font-medium",
        "underline-emphasis",
        props.className,
      )}
    />
  );
}

export function CounterValue(props: ComponentProps<"div">) {
  return (
    <div
      {...props}
      className={clsx("text-lg leading-5 font-medium", props.className)}
    />
  );
}

export function CounterValueUnit(props: ComponentProps<"span">) {
  return (
    <span
      {...props}
      className={clsx("ml-0.5 text-xs leading-0", props.className)}
    />
  );
}
