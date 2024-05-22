import { forwardRef, HTMLAttributes, memo, ReactNode } from "react";
import { clsx } from "clsx";
import { usePress } from "react-aria";
import { ButtonProps } from "react-aria-components";

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
    onPress?: ButtonProps["onPress"];
    children: ReactNode;
    className?: string;
    style?: React.CSSProperties;
  }
>(({ className, children, onPress, style }, ref) => {
  const { pressProps } = usePress({ onPress });

  return (
    <div
      ref={ref}
      role="row"
      style={style}
      className={clsx(
        "bg-app flex gap-6 border-b last:border-b-0",
        onPress && "hover:bg-hover",
        className,
      )}
      {...pressProps}
    >
      {children}
    </div>
  );
});

const ListLoader = memo((props: { children: ReactNode }) => {
  const visible = useDelayedVisible(500);
  if (!visible) {
    return null;
  }
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

export function ListLoadMore(props: { onPress: () => void }) {
  return (
    <div className="pt-2">
      <Button
        variant="secondary"
        className="w-full justify-center"
        onPress={props.onPress}
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
