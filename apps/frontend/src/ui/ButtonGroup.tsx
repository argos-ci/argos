import { ComponentPropsWithRef } from "react";
import { clsx } from "clsx";

export function ButtonGroup(props: ComponentPropsWithRef<"div">) {
  return (
    <div
      {...props}
      className={clsx(props.className, "group/button-group inline-flex")}
    />
  );
}
