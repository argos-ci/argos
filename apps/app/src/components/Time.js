import moment from "moment";
import * as React from "react";
import { Children, forwardRef, useCallback, useEffect, useState } from "react";

export const Time = forwardRef(({ date, children, ...props }, ref) => {
  const hasChildren = Children.count(children) > 0;
  const getDateFromNow = useCallback(
    () => (hasChildren ? null : moment(date).fromNow()),
    [hasChildren, date]
  );
  const [fromNow, setFromNow] = useState(getDateFromNow);
  useEffect(() => {
    const id = setInterval(() => setFromNow(getDateFromNow()), 1000);
    return () => clearInterval(id);
  }, [getDateFromNow]);
  return (
    <time
      ref={ref}
      data-test-hidden
      dateTime={moment(date).toJSON()}
      title={moment(date).format("LLLL")}
      {...props}
    >
      {children ?? fromNow}
    </time>
  );
});
