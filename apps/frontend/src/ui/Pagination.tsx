import { clsx } from "clsx";
import * as React from "react";
import { Button, ButtonProps } from "./Button";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";

const Pagination = ({ className, ...props }: React.ComponentProps<"nav">) => (
  <nav
    role="navigation"
    aria-label="pagination"
    className={clsx("mx-auto flex w-full justify-center", className)}
    {...props}
  />
);

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

const PaginationButtonItem = ({
  className,
  isActive,
  size = "base",
  ...props
}: PaginationButtonItemProps) => (
  <li>
    <Button
      {...props}
      variant={isActive ? "contained" : "outline"}
      color="neutral"
      size={size}
      aria-current={isActive ? "page" : undefined}
      className={clsx(
        "flex items-center min-w-[44px] justify-center",
        className,
      )}
    >
      {props.children}
    </Button>
  </li>
);

const PaginationPrevious = ({
  className,
  ...props
}: React.ComponentProps<typeof PaginationButtonItem>) => (
  <PaginationButtonItem
    aria-label="Go to previous page"
    className={clsx("gap-1 pl-2.5", className)}
    {...props}
  >
    <ChevronLeft className="h-4 w-4" />
    <span>Previous</span>
  </PaginationButtonItem>
);
PaginationPrevious.displayName = "PaginationPrevious";

const PaginationNext = ({
  className,
  ...props
}: React.ComponentProps<typeof PaginationButtonItem>) => (
  <PaginationButtonItem
    aria-label="Go to next page"
    className={clsx("gap-1 pr-2.5", className)}
    {...props}
  >
    <span>Next</span>
    <ChevronRight className="h-4 w-4" />
  </PaginationButtonItem>
);

const PaginationEllipsis = ({
  className,
  ...props
}: React.ComponentProps<"span">) => (
  <span
    aria-hidden
    className={clsx("flex h-9 w-9 items-end justify-center", className)}
    {...props}
  >
    <MoreHorizontal className="h-4 w-4" />
    <span className="sr-only">More pages</span>
  </span>
);

export {
  Pagination,
  PaginationContent,
  PaginationButtonItem,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
};
