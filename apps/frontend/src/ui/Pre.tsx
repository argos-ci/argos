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
        "bg-ui relative truncate rounded-lg p-4 whitespace-pre-wrap",
        // A phone keeps the code clear of the copy button laid over it, and
        // breaks a long token or URL rather than cutting it off.
        "max-md:pr-10 max-md:wrap-anywhere",
      )}
    >
      <CopyButton
        className="absolute top-3 right-2 text-lg"
        text={code}
        copyRef={copyRef}
      />
      <code>{code}</code>
    </pre>
  );
}
