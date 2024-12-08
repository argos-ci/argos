import { clsx } from "clsx";

import { CopyButton } from "./CopyButton";

type PreProps = Omit<React.ComponentPropsWithRef<"pre">, "children"> & {
  code: string;
};

export function Pre({ code, ...rest }: PreProps) {
  return (
    <pre
      {...rest}
      className={clsx(
        rest.className,
        "bg-ui relative whitespace-pre-wrap rounded p-4",
      )}
    >
      <CopyButton className="absolute right-2 top-4 text-lg" text={code} />
      <code>{code}</code>
    </pre>
  );
}
