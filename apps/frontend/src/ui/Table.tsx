import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { assertNever } from "@argos/util/assertNever";
import clsx from "clsx";

type TableProps = {
  children: ReactNode;
  tableClassName?: string;
  size?: "default" | "sm";
} & ComponentPropsWithoutRef<"div">;

export function Table({
  children,
  tableClassName,
  size = "default",
  className,
  ...props
}: TableProps) {
  return (
    <div
      {...props}
      className={clsx("overflow-x-auto rounded-sm border", className)}
    >
      <table
        className={clsx(
          "w-full table-fixed border-collapse",
          size === "sm" && "text-sm",
          tableClassName,
        )}
      >
        {children}
      </table>
    </div>
  );
}

type SectionProps<T extends "thead" | "tbody" | "tfoot"> = {
  zebra?: "ui" | "app";
} & ComponentPropsWithoutRef<T>;

function getZebraClass(zebra: SectionProps<"thead">["zebra"]) {
  if (zebra === "ui") {
    return "[&>*:nth-child(odd)]:bg-ui";
  }
  if (zebra === "app") {
    return "[&>*:nth-child(odd)]:bg-app";
  }
  if (zebra === undefined) {
    return undefined;
  }
  return assertNever(zebra);
}

export function Thead(props: SectionProps<"thead">) {
  const { zebra, className, ...rest } = props;
  return <thead {...rest} className={clsx(getZebraClass(zebra), className)} />;
}

export function Tbody(props: SectionProps<"tbody">) {
  const { zebra, className, ...rest } = props;
  return <tbody {...rest} className={clsx(getZebraClass(zebra), className)} />;
}

export function Tfoot(props: SectionProps<"tfoot">) {
  const { zebra, className, ...rest } = props;
  return <tfoot {...rest} className={clsx(getZebraClass(zebra), className)} />;
}

type TrProps = {
  variant?: "default" | "header";
  tone?: "default" | "app" | "subtle";
  bordered?: boolean;
} & ComponentPropsWithoutRef<"tr">;

export function Tr({
  variant = "default",
  tone = "default",
  bordered = false,
  className,
  ...props
}: TrProps) {
  return (
    <tr
      {...props}
      className={clsx(
        variant === "header" && "text-low text-xs font-semibold",
        tone === "app" && "bg-app",
        tone === "subtle" && "bg-subtle",
        bordered && "border-b",
        className,
      )}
    />
  );
}

type CellAlign = "left" | "right" | "center";
type CellPadding = "sm" | "md";

function getAlignClass(align: CellAlign) {
  switch (align) {
    case "center":
      return "text-center";
    case "right":
      return "text-right";
    case "left":
      return "text-left";
    default:
      return assertNever(align);
  }
}

function getPaddingClass(padding: CellPadding) {
  switch (padding) {
    case "sm":
      return "px-3 py-2";
    case "md":
      return "px-4 py-3";
    default:
      return assertNever(padding);
  }
}

type SharedCellVariantProps = {
  align?: CellAlign;
  padding?: CellPadding;
};

type ThProps = SharedCellVariantProps & ComponentPropsWithoutRef<"th">;

export function Th({
  align = "left",
  padding = "md",
  className,
  ...props
}: ThProps) {
  return (
    <th
      {...props}
      className={clsx(
        getPaddingClass(padding),
        getAlignClass(align),
        className,
      )}
    />
  );
}

type TdProps = SharedCellVariantProps &
  ComponentPropsWithoutRef<"td"> & {
    size?: "default" | "sm";
  };

export function Td({
  align = "left",
  padding = "md",
  size = "default",
  className,
  ...props
}: TdProps) {
  return (
    <td
      {...props}
      className={clsx(
        getPaddingClass(padding),
        getAlignClass(align),
        size === "sm" && "text-sm",
        className,
      )}
    />
  );
}

export function Caption(props: ComponentPropsWithoutRef<"caption">) {
  return <caption {...props} className={clsx("text-low p-2 text-sm", props.className)} />;
}
