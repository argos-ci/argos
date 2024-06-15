import { forwardRef } from "react";
import { clsx } from "clsx";
import { ExternalLinkIcon } from "lucide-react";
import {
  Link as RACLink,
  LinkProps as RACLinkProps,
} from "react-aria-components";

type LinkProps = RACLinkProps & { external?: boolean };

export type HeadlessLinkProps = LinkProps;

export const HeadlessLink = forwardRef<HTMLAnchorElement, LinkProps>(
  ({ target, children, external, className, ...props }, ref) => {
    const isExternal =
      external !== undefined
        ? external
        : typeof children !== "function" && target === "_blank";
    return (
      <RACLink
        ref={ref}
        className={clsx("rac-focus", className)}
        target={target}
        {...props}
      >
        {isExternal ? (
          <>
            {children}
            <ExternalLinkIcon className="mb-0.5 ml-1 inline size-[1em]" />
          </>
        ) : (
          children
        )}
      </RACLink>
    );
  },
);

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(
  ({ className, ...props }, ref) => {
    return (
      <HeadlessLink
        ref={ref}
        className={clsx(
          "text-primary-low rac-focus no-underline hover:underline",
          className,
        )}
        {...props}
      />
    );
  },
);
