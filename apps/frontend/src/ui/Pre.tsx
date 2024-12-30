import { clsx } from "clsx";

import { CopyButton } from "./CopyButton";

type CopyButtonProps = React.ComponentProps<typeof CopyButton>;

type PreProps = Omit<React.ComponentPropsWithRef<"pre">, "children"> &
  Pick<CopyButtonProps, "copyRef"> & {
    code: string;
  };

export function Pre({ code, copyRef, ...rest }: PreProps) {
  return (
    <pre
      {...rest}
      className={clsx(
        rest.className,
        "bg-ui relative whitespace-pre-wrap rounded p-4",
      )}
    >
      <CopyButton
        className="absolute right-2 top-4 text-lg"
        text={code}
        copyRef={copyRef}
      />
      <code>{code}</code>
    </pre>
  );
}
