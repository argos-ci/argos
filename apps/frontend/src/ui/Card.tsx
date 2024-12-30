import { ComponentPropsWithRef } from "react";
import { clsx } from "clsx";

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
        rest.className,
        "bg-app w-full overflow-hidden rounded border border-[--card-border]",
        intent === "danger"
          ? "[--card-border:theme(borderColor.danger.hover)] [--card-footer-bg:theme(backgroundColor.danger.ui)]"
          : "[--card-border:theme(borderColor.DEFAULT)]",
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
        "border-t border-[--card-border] bg-[--card-footer-bg,theme(backgroundColor.subtle)] p-4 text-sm",
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
      className={clsx(props.className, "border-t")}
    />
  );
}
