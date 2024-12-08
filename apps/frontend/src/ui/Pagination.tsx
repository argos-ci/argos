import { clsx } from "clsx";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";

import { Button, ButtonProps } from "./Button";

function Pagination(props: React.ComponentPropsWithRef<"nav">) {
  return (
    <nav
      aria-label="Pagination"
      {...props}
      className={clsx("mx-auto flex w-full justify-center", props.className)}
    />
  );
}

function PaginationContent(props: React.ComponentPropsWithRef<"ul">) {
  return (
    <ul
      {...props}
      className={clsx("flex flex-row items-center gap-1", props.className)}
    />
  );
}

type PaginationButtonItemProps = {
  isActive?: boolean;
} & ButtonProps;

function PaginationButtonItem({
  className,
  isActive,
  ...props
}: PaginationButtonItemProps) {
  return (
    <li>
      <Button
        {...props}
        variant={isActive ? "primary" : "secondary"}
        aria-current={isActive ? "page" : undefined}
        className={clsx(
          "flex min-w-[44px] items-center justify-center",
          className,
        )}
      >
        {props.children}
      </Button>
    </li>
  );
}

function PaginationPrevious(
  props: Omit<PaginationButtonItemProps, "children" | "aria-label">,
) {
  return (
    <PaginationButtonItem
      aria-label="Go to previous page"
      {...props}
      className={clsx("gap-1 pl-2.5", props.className)}
    >
      <ChevronLeft className="size-4" />
      <span>Previous</span>
    </PaginationButtonItem>
  );
}

function PaginationNext(
  props: Omit<PaginationButtonItemProps, "children" | "aria-label">,
) {
  return (
    <PaginationButtonItem
      aria-label="Go to next page"
      {...props}
      className={clsx("gap-1 pl-2.5", props.className)}
    >
      <span>Next</span>
      <ChevronRight className="size-4" />
    </PaginationButtonItem>
  );
}

function PaginationEllipsis(
  props: Omit<React.ComponentPropsWithRef<"span">, "children" | "aria-hidden">,
) {
  return (
    <span
      aria-hidden
      {...props}
      className={clsx("flex size-9 items-end justify-center", props.className)}
    >
      <MoreHorizontal className="size-4" />
      <span className="sr-only">More pages</span>
    </span>
  );
}

export {
  Pagination,
  PaginationContent,
  PaginationButtonItem,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
};
