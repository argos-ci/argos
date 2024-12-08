import { useEffect, useState } from "react";
import { invariant } from "@argos/util/invariant";
import { clsx } from "clsx";
import { useObjectRef } from "react-aria";

import { Tooltip } from "./Tooltip";

type TruncableProps = Omit<React.ComponentPropsWithRef<"div">, "children"> & {
  children: React.ReactNode;
};

export function Truncable({ ref: propRef, children, ...rest }: TruncableProps) {
  const ref = useObjectRef(propRef);
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    invariant(ref.current);
    setIsEnabled(ref.current.scrollWidth > ref.current.clientWidth);
  }, [ref]);

  return (
    <Tooltip content={isEnabled ? children : null}>
      <div ref={ref} {...rest} className={clsx("truncate", rest.className)}>
        {children}
      </div>
    </Tooltip>
  );
}
