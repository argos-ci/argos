import { clsx } from "clsx";
import {
  HTMLAttributes,
  ReactNode,
  cloneElement,
  forwardRef,
  memo,
} from "react";

import { Loader, useDelayedVisible } from "./Loader";

export const List = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="table"
        className={clsx(
          "flex flex-col rounded border overflow-auto",
          className,
        )}
        {...props}
      />
    );
  },
);

export const ListRow = forwardRef<
  HTMLDivElement,
  {
    clickable?: boolean;
    asChild?: boolean;
  } & HTMLAttributes<HTMLDivElement>
>(({ className, clickable, asChild, children, ...props }, ref) => {
  const childProps = {
    ref,
    role: "row",
    className: clsx(
      "flex gap-6 border-b last:border-b-0 bg-app",
      clickable && "hover:bg-hover",
      className,
    ),
    ...props,
  };

  if (asChild) {
    const child = children as React.ReactElement;
    return cloneElement(child, childProps);
  }

  return <div {...childProps}>{children}</div>;
});

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

export const ListRowLoader = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  return (
    <ListRow
      ref={ref}
      className={clsx(className, "items-center justify-center gap-2 text-low")}
      {...props}
    >
      <ListLoader>{children}</ListLoader>
    </ListRow>
  );
});
