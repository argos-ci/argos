import { forwardRef } from "react";
import { Link as ReactRouterLink } from "react-router-dom";
import type { LinkProps as ReactRouterLinkProps } from "react-router-dom";

export type LinkProps = ReactRouterLinkProps;

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(
  ({ className, ...props }, ref) => {
    return (
      <ReactRouterLink
        ref={ref}
        className={`${className} text-sky-400 no-underline hover:underline`}
        {...props}
      />
    );
  }
);
