import { clsx } from "clsx";
import { forwardRef } from "react";

export type ButtonGroupProps = React.HTMLAttributes<HTMLDivElement>;

export const ButtonGroup = forwardRef<HTMLDivElement, ButtonGroupProps>(
  (props, ref) => {
    const { className, ...rest } = props;
    return (
      <div
        ref={ref}
        className={clsx(className, "group/button-group inline-flex")}
        {...rest}
      />
    );
  }
);
