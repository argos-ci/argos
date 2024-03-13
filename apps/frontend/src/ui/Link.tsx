import { forwardRef } from "react";
import { clsx } from "clsx";
import { Link as ReactRouterLink } from "react-router-dom";
import type { LinkProps as ReactRouterLinkProps } from "react-router-dom";

import { anchorClassNames } from "./Anchor";

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
