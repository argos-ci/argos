import { ComponentPropsWithRef } from "react";
import { clsx } from "clsx";

import { getSurfaceClassName } from "./Panel";

export function Card(
  props: ComponentPropsWithRef<"div"> & {
    intent?: "danger";
  },
) {
  const { intent, ...rest } = props;
  return (
    <div
      {...rest}
      className={clsx(
        // The same surface as the sidebar's panels; `--card-border` only tints
        // the hairline, so a danger card keeps the shape.
        getSurfaceClassName(),
        "w-full overflow-hidden border-(--card-border)",
        intent === "danger"
          ? "shadow-(color:--red-12) [--card-border:var(--border-color-danger-hover)] [--card-footer-bg:var(--background-color-danger-ui)]"
          : "[--card-border:var(--border-color-default)]",
        rest.className,
      )}
    />
  );
}

export function CardBody(props: ComponentPropsWithRef<"div">) {
  return <div {...props} className={clsx("p-4", props.className)} />;
}

export function CardFooter(props: ComponentPropsWithRef<"div">) {
  return (
    <div
      {...props}
      className={clsx(
        "border-t-thin border-(--card-border) bg-(--card-footer-bg,var(--background-color-app)) p-4 text-sm",
        // A footer is a note, then the card's actions. On a phone the note
        // takes its own line and the actions go under it, on the right, where
        // the desktop has them; an empty note leaves no blank line.
        "max-md:flex-wrap max-md:*:empty:hidden max-md:*:first:not-last:basis-full max-md:*:last:not-first:ml-auto",
        props.className,
      )}
    />
  );
}

/**
 * Several actions in a card's footer. On a phone they share their line, each
 * growing to fill it, or stack full width when they do not fit, the main one,
 * last, on top.
 */
export function CardFooterActions(props: ComponentPropsWithRef<"div">) {
  return (
    <div
      {...props}
      className={clsx(
        "flex items-center gap-2 max-md:basis-full max-md:flex-wrap-reverse max-md:*:grow max-md:*:justify-center",
        props.className,
      )}
    />
  );
}

export function CardTitle(props: ComponentPropsWithRef<"div">) {
  return (
    <h2
      {...props}
      className={clsx("mb-4 text-xl font-semibold", props.className)}
    />
  );
}

export function CardParagraph(props: ComponentPropsWithRef<"div">) {
  return <div {...props} className={clsx("my-4 last:mb-0", props.className)} />;
}

export function CardSeparator(
  props: Omit<ComponentPropsWithRef<"div">, "role" | "aria-orientation">,
) {
  return (
    <div
      {...props}
      role="separator"
      aria-orientation="horizontal"
      className={clsx(props.className, "border-t-thin")}
    />
  );
}
