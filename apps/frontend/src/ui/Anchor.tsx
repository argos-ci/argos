import { clsx } from "clsx";
import { ExternalLinkIcon } from "lucide-react";
import * as React from "react";

export const EmulatedAnchor = React.forwardRef(
  (
    {
      href,
      target = "_self",
      onClick,
      children,
      ...props
    }: {
      href: string;
      target?: string;
    } & React.HTMLAttributes<HTMLDivElement>,
    ref: React.ForwardedRef<HTMLDivElement>,
  ) => {
    return (
      <div
        ref={ref}
        onClick={(event) => {
          onClick?.(event);
          event.preventDefault();
          window.open(href, target)?.focus();
        }}
        {...props}
      >
        {children}
      </div>
    );
  },
);

type AnchorProps = React.AllHTMLAttributes<HTMLAnchorElement> & {
  external?: boolean;
};

export const HeadlessAnchor = React.forwardRef(
  (
    { external, children, ...props }: AnchorProps,
    ref: React.ForwardedRef<HTMLAnchorElement>,
  ) => {
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

export const anchorClassNames = "text-primary-low no-underline hover:underline";

export const Anchor = React.forwardRef(
  (
    { className, ...props }: AnchorProps,
    ref: React.ForwardedRef<HTMLAnchorElement>,
  ) => {
    return (
      <HeadlessAnchor
        ref={ref}
        className={clsx(anchorClassNames, className)}
        {...props}
      />
    );
  },
);
