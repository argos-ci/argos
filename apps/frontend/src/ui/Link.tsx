import { ExternalLinkIcon } from "lucide-react";
import { clsx } from "clsx";
import { HTMLProps, forwardRef } from "react";
import { Link as ReactRouterLink } from "react-router-dom";
import type { LinkProps as ReactRouterLinkProps } from "react-router-dom";

export type LinkProps = ReactRouterLinkProps;

export const anchorClassNames = "text-primary-low no-underline hover:underline";

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(
  ({ className, ...props }, ref) => {
    return (
      <ReactRouterLink
        ref={ref}
        className={clsx(className, anchorClassNames)}
        {...props}
      />
    );
  },
);

interface AnchorProps extends HTMLProps<HTMLAnchorElement> {
  external?: boolean;
}

export const Anchor = forwardRef<HTMLAnchorElement, AnchorProps>(
  ({ className, external, children, ...props }, ref) => {
    const externalAttributes = external
      ? { target: "_blank", rel: "noopener noreferrer" }
      : {};
    return (
      <a
        ref={ref}
        className={clsx(anchorClassNames, className)}
        {...externalAttributes}
        {...props}
      >
        {children}
        {external && (
          <ExternalLinkIcon className="ml-1 h-[1em] w-[1em] inline mb-0.5" />
        )}
      </a>
    );
  },
);
