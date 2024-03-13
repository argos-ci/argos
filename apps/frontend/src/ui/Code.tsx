import { ComponentProps } from "react";
import { clsx } from "clsx";

export const Code = ({ className, ...props }: ComponentProps<"code">) => {
  return (
    <code
      className={clsx(
        className,
        "bg-hover text rounded px-1 py-0.5 text-center font-mono text-[0.8em]",
      )}
      {...props}
    />
  );
};
