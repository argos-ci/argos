import type { ComponentPropsWithRef } from "react";
import { clsx } from "clsx";

export function StackedItems(props: ComponentPropsWithRef<"div">) {
  return (
    <div
      {...props}
      className={clsx("flex -space-x-1 empty:hidden", props.className)}
    />
  );
}
