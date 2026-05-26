import { ComponentPropsWithRef } from "react";
import { clsx } from "clsx";

export function Kbd(props: ComponentPropsWithRef<"kbd">) {
  return (
    <kbd
      {...props}
      className={clsx(
        "text-xxs text-default inline-flex h-4 min-w-4 items-center justify-center rounded-sm bg-(--mauve-a5) px-1",
        props.className,
      )}
    />
  );
}
