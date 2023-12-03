import moment from "moment";
import {
  Children,
  HTMLProps,
  forwardRef,
  useCallback,
  useEffect,
  useState,
} from "react";
import { Tooltip } from "./Tooltip";

type TimeProps = HTMLProps<HTMLTimeElement> & {
  date: string;
  format?: string;
  tooltip?: "title" | "tooltip" | "none";
  children?: React.ReactNode;
};

export const Time = forwardRef<HTMLTimeElement, TimeProps>(
  ({ date, format, children, tooltip = "tooltip", ...props }, ref) => {
    const hasChildren = Children.count(children) > 0;
    const getFormattedDate = useCallback(
      () =>
        hasChildren
          ? null
          : format
            ? moment(date).format(format)
            : moment(date).fromNow(),
      [hasChildren, format, date],
    );
    const [fromNow, setFromNow] = useState(getFormattedDate);
    useEffect(() => {
      const id = setInterval(() => setFromNow(getFormattedDate()), 1000);
      return () => clearInterval(id);
    }, [getFormattedDate]);
    return (
      <Tooltip
        content={tooltip === "tooltip" ? moment(date).format("LLLL") : null}
      >
        <time
          ref={ref}
          dateTime={moment(date).toISOString()}
          data-visual-test="transparent"
          title={tooltip === "title" ? moment(date).format("LLLL") : undefined}
          {...props}
        >
          {children ?? fromNow}
        </time>
      </Tooltip>
    );
  },
);
