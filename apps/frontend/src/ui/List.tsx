import {
  cloneElement,
  forwardRef,
  HTMLAttributes,
  memo,
  ReactNode,
} from "react";
import { clsx } from "clsx";

import { Button } from "./Button";
import { Loader, useDelayedVisible } from "./Loader";

export const List = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="table"
        className={clsx(
          "flex flex-col overflow-auto rounded border",
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
      className={clsx(className, "text-low items-center justify-center gap-2")}
      {...props}
    >
      <ListLoader>{children}</ListLoader>
    </ListRow>
  );
});

export function ListLoadMore(props: { onClick: () => void }) {
  return (
    <div className="pt-2">
      <Button
        variant="outline"
        color="neutral"
        className="w-full justify-center"
        onClick={props.onClick}
      >
        Load more
      </Button>
    </div>
  );
}

export function ListEmpty(props: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("py-2 font-medium", props.className)}>
      {props.children}
    </div>
  );
}

export function ListTitle(props: { children: React.ReactNode }) {
  return <h3 className="mb-2 text-sm font-semibold">{props.children}</h3>;
}
