import moment from "moment";
import * as React from "react";
import { x } from "@xstyled/styled-components";
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
    <x.time
      ref={ref}
      dateTime={moment(date).toISOString()}
      title={moment(date).format("LLLL")}
      data-visual-test="transparent"
      {...props}
    >
      {children ?? fromNow}
    </x.time>
  );
});
