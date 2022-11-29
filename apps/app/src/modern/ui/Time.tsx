import moment from "moment";
import {
  Children,
  forwardRef,
  HTMLProps,
  useCallback,
  useEffect,
  useState,
} from "react";

export interface TimeProps extends HTMLProps<HTMLTimeElement> {
  date: string;
  format?: string;
  children?: React.ReactNode;
}

export const Time = forwardRef<HTMLTimeElement, TimeProps>(
  ({ date, format, children, ...props }, ref) => {
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
        dateTime={moment(date).toISOString()}
        title={moment(date).format("LLLL")}
        data-visual-test="transparent"
        {...props}
      >
        {children ?? fromNow}
      </time>
    );
  }
);
