import { clsx } from "clsx";
import { HTMLAttributes } from "react";

import { CopyButton } from "./CopyButton";

export type PreProps = Omit<HTMLAttributes<HTMLPreElement>, "children"> & {
  code: string;
};

export const Pre = ({ className, code, ...props }: PreProps) => {
  return (
    <pre
      className={clsx(
        className,
        "relative whitespace-pre-wrap rounded bg-ui p-4",
      )}
      {...props}
    >
      <CopyButton className="absolute right-2 top-2 text-base" text={code} />
      <code>{code}</code>
    </pre>
  );
};
