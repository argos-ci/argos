import { clsx } from "clsx";

import { CopyButton } from "./CopyButton";

type CopyButtonProps = React.ComponentProps<typeof CopyButton>;

type PreProps = Omit<React.ComponentPropsWithRef<"pre">, "children"> &
  Pick<CopyButtonProps, "copyRef"> & {
    code: string;
    overrideTextToCopy?: string;
  };

export function Pre({ code, overrideTextToCopy, copyRef, ...rest }: PreProps) {
  return (
    <pre
      {...rest}
      className={clsx(
        rest.className,
        "bg-ui relative whitespace-pre-wrap rounded-sm p-4",
      )}
    >
      <CopyButton
        className="absolute right-2 top-4 text-lg"
        text={overrideTextToCopy ?? code}
        copyRef={copyRef}
      />
      <code>{code}</code>
    </pre>
  );
}
