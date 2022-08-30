import moment from "moment";
import * as React from "react";
import { Children, forwardRef, useCallback, useEffect, useState } from "react";

export const Time = forwardRef(({ date, format, children, ...props }, ref) => {
  const hasChildren = Children.count(children) > 0;
  const getFormattedDate = useCallback(
    () =>
      hasChildren
        ? null
        : format
        ? moment(date).format(format)
        : moment(date).fromNow(),
    [hasChildren, format, date]
  );
  const [fromNow, setFromNow] = useState(getFormattedDate);
  useEffect(() => {
    const id = setInterval(() => setFromNow(getFormattedDate()), 1000);
    return () => clearInterval(id);
  }, [getFormattedDate]);
  return (
    <time
      ref={ref}
      data-test-hidden
      dateTime={moment(date).toISOString()}
      title={moment(date).format("LLLL")}
      {...props}
    >
      {children ?? fromNow}
    </time>
  );
});
