import { forwardRef } from "react";
import { clsx } from "clsx";

export const ButtonGroup = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>((props, ref) => {
  const { className, ...rest } = props;
  return (
    <div
      ref={ref}
      className={clsx(className, "group/button-group inline-flex")}
      {...rest}
    />
  );
});
