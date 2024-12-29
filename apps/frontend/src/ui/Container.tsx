import { ComponentPropsWithRef } from "react";
import { clsx } from "clsx";

export function Container(props: ComponentPropsWithRef<"div">) {
  return (
    <div
      {...props}
      className={clsx("container mx-auto px-4", props.className)}
    />
  );
}
