import * as React from "react";
import { clsx } from "clsx";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";

import { Button, ButtonProps } from "./Button";

function Pagination({ className, ...props }: React.ComponentProps<"nav">) {
  return (
    <nav
      role="navigation"
      aria-label="pagination"
      className={clsx("mx-auto flex w-full justify-center", className)}
      {...props}
    />
  );
}

const PaginationContent = React.forwardRef<
  HTMLUListElement,
  React.ComponentProps<"ul">
>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    className={clsx("flex flex-row items-center gap-1", className)}
    {...props}
  />
));

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

function PaginationPrevious({
  className,
  ...props
}: React.ComponentProps<typeof PaginationButtonItem>) {
  return (
    <PaginationButtonItem
      aria-label="Go to previous page"
      className={clsx("gap-1 pl-2.5", className)}
      {...props}
    >
      <ChevronLeft className="size-4" />
      <span>Previous</span>
    </PaginationButtonItem>
  );
}

function PaginationNext({
  className,
  ...props
}: React.ComponentProps<typeof PaginationButtonItem>) {
  return (
    <PaginationButtonItem
      aria-label="Go to next page"
      className={clsx("gap-1 pr-2.5", className)}
      {...props}
    >
      <span>Next</span>
      <ChevronRight className="size-4" />
    </PaginationButtonItem>
  );
}

function PaginationEllipsis({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      aria-hidden
      className={clsx("flex size-9 items-end justify-center", className)}
      {...props}
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
