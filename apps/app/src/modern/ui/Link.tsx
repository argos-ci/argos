import { AnchorHTMLAttributes, forwardRef } from "react";
import { Link as ReactRouterLink } from "react-router-dom";
import type { LinkProps as ReactRouterLinkProps } from "react-router-dom";
import { clsx } from "clsx";

export type LinkProps = ReactRouterLinkProps;

const anchorClassNames = "text-sky-400 no-underline hover:underline";

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(
  ({ className, ...props }, ref) => {
    return (
      <ReactRouterLink
        ref={ref}
        className={clsx(className, anchorClassNames)}
        {...props}
      />
    );
  }
);

export const Anchor = forwardRef<
  HTMLAnchorElement,
  AnchorHTMLAttributes<HTMLAnchorElement>
>(({ className, ...props }, ref) => {
  return (
    <a ref={ref} className={clsx(className, anchorClassNames)} {...props} />
  );
});
