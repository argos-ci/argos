import { ExternalLinkIcon } from "lucide-react";
import { clsx } from "clsx";
import { AllHTMLAttributes, forwardRef } from "react";
import { Link as ReactRouterLink } from "react-router-dom";
import type { LinkProps as ReactRouterLinkProps } from "react-router-dom";

export const anchorClassNames = "text-primary-low no-underline hover:underline";

export const Link = forwardRef<HTMLAnchorElement, ReactRouterLinkProps>(
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

interface AnchorProps extends AllHTMLAttributes<HTMLAnchorElement> {
  external?: boolean;
}

export const HeadlessAnchor = forwardRef<HTMLAnchorElement, AnchorProps>(
  ({ external, children, ...props }, ref) => {
    const externalAttributes = external
      ? { target: "_blank", rel: "noopener noreferrer" }
      : {};
    return (
      <a ref={ref} {...externalAttributes} {...props}>
        {children}
        {external && (
          <ExternalLinkIcon className="ml-1 h-[1em] w-[1em] inline mb-0.5" />
        )}
      </a>
    );
  },
);

export const Anchor = forwardRef<HTMLAnchorElement, AnchorProps>(
  ({ className, ...props }, ref) => {
    return (
      <HeadlessAnchor
        ref={ref}
        className={clsx(anchorClassNames, className)}
        {...props}
      />
    );
  },
);
