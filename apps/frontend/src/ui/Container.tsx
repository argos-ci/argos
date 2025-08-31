import { ComponentPropsWithRef } from "react";
import { clsx } from "clsx";

export type ContainerProps = ComponentPropsWithRef<"div">;

export function Container(props: ContainerProps) {
  return (
    <div
      {...props}
      className={clsx("container mx-auto px-4", props.className)}
    />
  );
}
