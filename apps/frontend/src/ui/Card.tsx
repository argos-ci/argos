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
          ? "[--card-border:var(--border-color-danger-hover)] [--card-footer-bg:var(--background-color-danger-ui)]"
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
