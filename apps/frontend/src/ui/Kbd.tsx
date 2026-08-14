import { ComponentPropsWithRef } from "react";
import { clsx } from "clsx";

export function Kbd(props: ComponentPropsWithRef<"kbd">) {
  return (
    <kbd
      {...props}
      className={clsx(
        "text-default/80 inline-flex min-w-[1lh] items-center justify-center rounded-sm bg-(--gray-a2) border-thin px-1",
        props.className,
      )}
    />
  );
}
