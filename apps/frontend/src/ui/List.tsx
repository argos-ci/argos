import { ComponentPropsWithRef, memo, ReactNode } from "react";
import { clsx } from "clsx";
import {
  Link as RACLink,
  LinkProps as RACLinkProps,
} from "react-aria-components";

import { Button } from "./Button";
import { Loader, useDelayedVisible } from "./Loader";

export function List(props: Omit<ComponentPropsWithRef<"div">, "role">) {
  return (
    <div
      {...props}
      role="table"
      className={clsx(
        "flex flex-col overflow-auto rounded border",
        props.className,
      )}
    />
  );
}

const listRowClassName = "bg-app flex gap-6 border-b last:border-b-0";

export function ListRowLink(props: RACLinkProps) {
  return (
    <RACLink
      {...props}
      className={clsx(
        listRowClassName,
        "data-[hovered]:bg-hover data-[focus-visible]:bg-hover focus:outline-none",
        props.className,
      )}
    />
  );
}

type ListRowProps = Omit<ComponentPropsWithRef<"div">, "role">;

export function ListRow(props: ListRowProps) {
  return (
    <div
      {...props}
      role="row"
      className={clsx(listRowClassName, props.className)}
    />
  );
}

const ListLoader = memo(function ListLoader(props: { children: ReactNode }) {
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

export function ListRowLoader({ children, ...rest }: ListRowProps) {
  return (
    <ListRow
      {...rest}
      className={clsx(
        rest.className,
        "text-low items-center justify-center gap-2",
      )}
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

export function ListEmpty(props: ComponentPropsWithRef<"div">) {
  return (
    <div {...props} className={clsx("py-2 font-medium", props.className)} />
  );
}

export function ListTitle(props: ComponentPropsWithRef<"h3">) {
  return (
    <h3
      {...props}
      className={clsx("mb-2 text-sm font-semibold", props.className)}
    />
  );
}
