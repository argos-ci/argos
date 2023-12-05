import * as React from "react";

import { TooltipContent, TooltipRoot, TooltipTrigger } from "./Tooltip";
import { TooltipPortal } from "@radix-ui/react-tooltip";
import { clsx } from "clsx";

export const Truncable = ({
  className,
  children,
  ...props
}: Omit<React.HTMLAttributes<HTMLDivElement>, "children"> & {
  children: React.ReactNode;
}) => {
  const ref = React.useRef<HTMLButtonElement>(null);
  const [open, setOpen] = React.useState(false);

  const handleOpenChange = (open: boolean) => {
    setOpen(
      Boolean(
        open &&
          ref.current &&
          ref.current.scrollWidth > ref.current.clientWidth,
      ),
    );
  };

  return (
    <TooltipRoot
      open={open}
      onOpenChange={handleOpenChange}
      disableHoverableContent
    >
      <TooltipTrigger ref={ref} asChild>
        <div className={clsx("truncate", className)} {...props}>
          {children}
        </div>
      </TooltipTrigger>
      <TooltipPortal>
        <TooltipContent className="break-words">{children}</TooltipContent>
      </TooltipPortal>
    </TooltipRoot>
  );
};
