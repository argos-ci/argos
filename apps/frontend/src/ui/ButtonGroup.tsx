import { clsx } from "clsx";
import { forwardRef } from "react";

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
