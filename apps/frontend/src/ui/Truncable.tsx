import * as React from "react";
import { invariant } from "@argos/util/invariant";
import { clsx } from "clsx";

import { Tooltip } from "./Tooltip";

export function Truncable({
  className,
  children,
  ...props
}: Omit<React.HTMLAttributes<HTMLDivElement>, "children"> & {
  children: React.ReactNode;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [isEnabled, setIsEnabled] = React.useState(false);

  React.useEffect(() => {
    invariant(ref.current);
    setIsEnabled(ref.current.scrollWidth > ref.current.clientWidth);
  }, []);

  return (
    <Tooltip content={isEnabled ? children : null}>
      <div ref={ref} className={clsx("truncate", className)} {...props}>
        {children}
      </div>
    </Tooltip>
  );
}
