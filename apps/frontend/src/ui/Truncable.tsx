import * as React from "react";
import { clsx } from "clsx";

import { Tooltip } from "./Tooltip";

export function Truncable({
  className,
  children,
  ...props
}: Omit<React.HTMLAttributes<HTMLDivElement>, "children"> & {
  children: React.ReactNode;
}) {
  const ref = React.useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = React.useState(false);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(
      Boolean(
        open &&
          ref.current &&
          ref.current.scrollWidth > ref.current.clientWidth,
      ),
    );
  };

  return (
    <Tooltip content={children} isOpen={isOpen} onOpenChange={handleOpenChange}>
      <div className={clsx("truncate", className)} {...props}>
        {children}
      </div>
    </Tooltip>
  );
}
