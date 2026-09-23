import { ComponentPropsWithRef, memo, ReactNode, useTransition } from "react";
import { clsx } from "clsx";
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon } from "lucide-react";

import { Button } from "./Button";
import { HeadlessLink, type HeadlessLinkProps } from "./Link";
import { Loader, useDelayedVisible } from "./Loader";
import { getSurfaceClassName } from "./Panel";
import type { SortDirection } from "./SortHeader";
import { Tooltip } from "./Tooltip";

export function List(props: Omit<ComponentPropsWithRef<"div">, "role">) {
  return (
    <div
      {...props}
      role="table"
      className={clsx(
        // The same corners and hairline as a card: it is the same kind of
        // surface, holding rows instead of prose.
        "flex flex-col overflow-auto",
        getSurfaceClassName(),
        props.className,
      )}
    />
  );
}

const listRowClassName = "bg-app min-w-0 border-b-thin last:border-b-0";

export function ListRowLink(props: Omit<HeadlessLinkProps, "external">) {
  return (
    <HeadlessLink
      {...props}
      className={clsx(
        listRowClassName,
        "hover:bg-hover focus-visible:bg-hover focus:outline-hidden",
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

interface ListLoaderProps {
  children: ReactNode;
  /**
   * Delay in ms before showing the loader.
   * @default 500
   */
  delay?: number;
}

const ListLoader = memo(function ListLoader(props: ListLoaderProps) {
  const { children, delay = 500 } = props;
  const visible = useDelayedVisible(delay);
  if (!visible) {
    return null;
  }
  return (
    <>
      <Loader className="size-6" delay={0} />
      <span>{children}</span>
    </>
  );
});

export function ListRowLoader(props: ListRowProps & ListLoaderProps) {
  const { children, delay, ...rest } = props;
  return (
    <ListRow
      {...rest}
      className={clsx(
        rest.className,
        "text-low flex items-center justify-center gap-2 select-none",
      )}
    >
      <ListLoader delay={delay}>{children}</ListLoader>
    </ListRow>
  );
}

export function ListLoadMore(props: { onClick: () => void }) {
  const [isPending, startTransition] = useTransition();
  return (
    <div className="pt-2">
      <Button
        variant="secondary"
        className="w-full justify-center"
        pending={isPending}
        onClick={() => {
          startTransition(() => {
            props.onClick();
          });
        }}
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

export function ListHeaderRow(props: ComponentPropsWithRef<"div">) {
  return (
    <div
      {...props}
      className={clsx(
        listRowClassName,
        "text-low flex items-center gap-6 px-4 py-3 text-xs font-semibold",
        props.className,
      )}
    />
  );
}

/**
 * A header that sorts the list by its column.
 *
 * Like `SortHeader` for a table, it renders the `columnheader` itself, the only
 * place `aria-sort` means anything — and for the cell to count, the
 * `ListHeaderRow` holding it needs `role="row"`.
 */
export function ListSortHeader(props: {
  children: ReactNode;
  /** The direction the list runs in, or null when another column sorts it. */
  direction: SortDirection | null;
  onSort: () => void;
  /**
   * The side the label sits on. The arrow goes on the inner side, so the label
   * stays lined up with the values under it.
   * @default "start"
   */
  align?: "start" | "end";
  /** What the column measures, shown on hover and on keyboard focus. */
  tooltip?: ReactNode;
  className?: string;
}) {
  const {
    children,
    direction,
    onSort,
    align = "start",
    tooltip,
    className,
  } = props;
  const Icon =
    direction === "asc"
      ? ArrowUpIcon
      : direction === "desc"
        ? ArrowDownIcon
        : ArrowUpDownIcon;
  const button = (
    <button
      type="button"
      onClick={onSort}
      className={clsx(
        "group/sort focus-ring hover:text-default inline-flex items-center gap-1 rounded-sm whitespace-nowrap",
        align === "end" && "flex-row-reverse",
        direction && "text-default",
      )}
    >
      <span className={clsx(tooltip && "underline-emphasis")}>{children}</span>
      <Icon
        className={clsx(
          "size-3 shrink-0",
          !direction &&
            "opacity-0 transition-opacity group-hover/sort:opacity-100 group-focus-visible/sort:opacity-100",
        )}
      />
    </button>
  );

  return (
    <div
      role="columnheader"
      aria-sort={
        direction === "asc"
          ? "ascending"
          : direction === "desc"
            ? "descending"
            : "none"
      }
      className={clsx(align === "end" && "text-right", className)}
    >
      {tooltip ? <Tooltip content={tooltip}>{button}</Tooltip> : button}
    </div>
  );
}
