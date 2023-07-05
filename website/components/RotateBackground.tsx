import { HTMLProps } from "react";
import { clsx } from "clsx";

export const RotateBackground = ({
  children,
  className,
  ...props
}: HTMLProps<HTMLDivElement>) => {
  return (
    <div className={clsx(className, "transform -rotate-6 -mx-20")} {...props}>
      <div className="transform rotate-6 mx-20">{children}</div>
    </div>
  );
};
