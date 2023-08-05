import { clsx } from "clsx";
import { ComponentProps } from "react";

export const Code = ({ className, ...props }: ComponentProps<"code">) => {
  return (
    <code
      className={clsx(
        className,
        "rounded bg-hover px-1 py-0.5 text-center font-mono text-[0.8em] text"
      )}
      {...props}
    />
  );
};
