import { LinkExternalIcon } from "@primer/octicons-react";
import { clsx } from "clsx";
import { HTMLProps, forwardRef } from "react";
import { Link as ReactRouterLink } from "react-router-dom";
import type { LinkProps as ReactRouterLinkProps } from "react-router-dom";

export type LinkProps = ReactRouterLinkProps;

export const anchorClassNames = "text-sky-400 no-underline hover:underline";

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
        className={clsx(className, anchorClassNames)}
        {...externalAttributes}
        {...props}
      >
        {children}
        {external && (
          <LinkExternalIcon className="ml-[0.5ex] h-[1em] w-[1em]" />
        )}
      </a>
    );
  }
);
