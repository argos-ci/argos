import { useEffect, useState } from "react";
import { invariant } from "@argos/util/invariant";
import { clsx } from "clsx";

import { Tooltip, type TooltipProps } from "./Tooltip";
import { useObjectRef } from "./useObjectRef";

export interface TruncableProps extends Omit<
  React.ComponentPropsWithRef<"div">,
  "children"
> {
  children: React.ReactNode;
  tooltipProps?: Omit<TooltipProps, "content" | "children">;
}

export function Truncable({
  ref: propRef,
  children,
  tooltipProps,
  ...rest
}: TruncableProps) {
  const ref = useObjectRef(propRef);
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    invariant(ref.current);
    // The overflow can only be measured from the mounted DOM node, so it
    // cannot be derived during render.
    // oxlint-disable-next-line react/react-compiler
    setIsEnabled(ref.current.scrollWidth > ref.current.clientWidth);
  }, [ref]);

  return (
    <Tooltip content={isEnabled ? children : null} {...tooltipProps}>
      <div ref={ref} {...rest} className={clsx("truncate", rest.className)}>
        {children}
      </div>
    </Tooltip>
  );
}
