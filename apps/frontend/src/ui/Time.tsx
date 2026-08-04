import { Children, useCallback, useLayoutEffect, useState } from "react";
import {
  formatDate,
  formatRelativeDate,
  type DateFormat,
} from "@argos/util/date-format";

import { Tooltip } from "./Tooltip";

type TimeProps = React.ComponentPropsWithRef<"time"> & {
  date: string;
  format?: DateFormat;
  tooltip?: "title" | "tooltip" | "none";
  children?: React.ReactNode;
};

export function Time({
  date,
  format,
  children,
  tooltip = "tooltip",
  ...props
}: TimeProps) {
  const hasChildren = Children.count(children) > 0;
  const getFormattedDate = useCallback(
    () =>
      hasChildren
        ? null
        : format
          ? formatDate(new Date(date), format)
          : formatRelativeDate(new Date(date)),
    [hasChildren, format, date],
  );
  const [fromNow, setFromNow] = useState(getFormattedDate);
  useLayoutEffect(() => {
    const id = setInterval(() => setFromNow(getFormattedDate()), 1000);
    return () => clearInterval(id);
  }, [getFormattedDate]);
  const fullDate = formatDate(new Date(date), "fullDateTime");
  return (
    <Tooltip content={tooltip === "tooltip" ? fullDate : null}>
      <time
        dateTime={new Date(date).toISOString()}
        data-visual-test="transparent"
        title={tooltip === "title" ? fullDate : undefined}
        {...props}
      >
        {children ?? fromNow}
      </time>
    </Tooltip>
  );
}
