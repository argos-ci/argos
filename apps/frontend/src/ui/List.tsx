import { forwardRef, HTMLAttributes, memo, ReactNode } from "react";
import { clsx } from "clsx";
import {
  Link as RACLink,
  LinkProps as RACLinkProps,
} from "react-aria-components";

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

const listRowClassName = "bg-app flex gap-6 border-b last:border-b-0";

export function ListRowLink({ className, ...props }: RACLinkProps) {
  return (
    <RACLink
      className={clsx(
        listRowClassName,
        "data-[hovered]:bg-hover data-[focus-visible]:bg-hover focus:outline-none",
        className,
      )}
      {...props}
    />
  );
}

export function ListRow({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div role="row" className={clsx(listRowClassName, className)} {...props} />
  );
}

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

export function ListRowLoader({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <ListRow
      className={clsx(className, "text-low items-center justify-center gap-2")}
      {...props}
    >
      <ListLoader>{children}</ListLoader>
    </ListRow>
  );
}

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
