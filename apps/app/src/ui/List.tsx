import { clsx } from "clsx";
import {
  HTMLAttributes,
  ReactNode,
  cloneElement,
  forwardRef,
  memo,
} from "react";

import { Loader, useDelayedVisible } from "./Loader";

export type ListProps = HTMLAttributes<HTMLDivElement>;

export const List = forwardRef<HTMLDivElement, ListProps>(
  ({ className, ...props }: ListProps, ref) => {
    return (
      <div
        ref={ref}
        role="table"
        className={clsx("flex flex-col rounded border", className)}
        {...props}
      />
    );
  }
);

export type ListRowProps = {
  clickable?: boolean;
  asChild?: boolean;
} & HTMLAttributes<HTMLDivElement>;

export const ListRow = forwardRef<HTMLDivElement, ListRowProps>(
  (
    { className, clickable, asChild, children, ...props }: ListRowProps,
    ref
  ) => {
    const childProps = {
      ref,
      role: "row",
      className: clsx(
        "flex items-center gap-4 border-b last:border-b-0",
        clickable && "hover:bg-hover",
        className
      ),
      ...props,
    };

    if (asChild) {
      const child = children as React.ReactElement;
      return cloneElement(child, childProps);
    }

    return <div {...childProps}>{children}</div>;
  }
);

export type ListHeaderProps = HTMLAttributes<HTMLDivElement>;

export const ListHeader = forwardRef<HTMLDivElement, ListHeaderProps>(
  ({ className, ...props }: ListHeaderProps, ref) => {
    return (
      <div
        ref={ref}
        role="rowheader"
        className={clsx(
          "border-b-border whitespace-nowrap border-b bg-subtle text-xs font-medium uppercase text-low",
          className
        )}
        {...props}
      />
    );
  }
);

const ListLoader = memo((props: { children: ReactNode }) => {
  const visible = useDelayedVisible(500);
  if (!visible) return null;
  return (
    <>
      <Loader size={24} delay={0} />
      <span>{props.children}</span>
    </>
  );
});

export type ListRowLoaderProps = HTMLAttributes<HTMLDivElement>;
export const ListRowLoader = forwardRef<HTMLDivElement, ListRowLoaderProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <ListRow
        ref={ref}
        className={clsx(className, "justify-center gap-2 text-sm text-low")}
        {...props}
      >
        <ListLoader>{children}</ListLoader>
      </ListRow>
    );
  }
);
