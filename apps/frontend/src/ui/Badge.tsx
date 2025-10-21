import type { ComponentPropsWithRef } from "react";
import { clsx } from "clsx";

export function Badge(props: ComponentPropsWithRef<"div">) {
  return (
    <div
      {...props}
      className={clsx(
        "text-xxs bg-app text-low rounded-md border px-2 py-0.5 leading-none font-semibold tabular-nums",
        props.className,
      )}
    />
  );
}
