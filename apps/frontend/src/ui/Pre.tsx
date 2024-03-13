import { HTMLAttributes } from "react";
import { clsx } from "clsx";

import { CopyButton } from "./CopyButton";

export const Pre = ({
  className,
  code,
  ...props
}: Omit<HTMLAttributes<HTMLPreElement>, "children"> & {
  code: string;
}) => {
  return (
    <pre
      className={clsx(
        className,
        "bg-ui relative whitespace-pre-wrap rounded p-4",
      )}
      {...props}
    >
      <CopyButton className="absolute right-2 top-4 text-lg" text={code} />
      <code>{code}</code>
    </pre>
  );
};
