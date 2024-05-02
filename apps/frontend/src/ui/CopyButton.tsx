import { ButtonHTMLAttributes } from "react";
import { clsx } from "clsx";
import { CheckIcon, ClipboardIcon } from "lucide-react";
import { useClipboard } from "use-clipboard-copy";

import { Tooltip } from "./Tooltip";

export const CopyButton = ({
  text,
  onClick,
  className,
  ...props
}: { text: string } & ButtonHTMLAttributes<HTMLButtonElement>) => {
  const clipboard = useClipboard({ copiedTimeout: 2000 });
  return (
    <Tooltip
      content={clipboard.copied ? "Copied!" : "Copy"}
      onPointerDownOutside={(event) => {
        event.preventDefault();
      }}
    >
      <button
        className={clsx(
          className,
          "text-low hover:text bg-ui hover:bg-hover cursor-default rounded p-0.5",
        )}
        onClick={(event) => {
          onClick?.(event);
          if (!event.defaultPrevented) {
            event.preventDefault();
            clipboard.copy(text);
          }
        }}
        {...props}
      >
        {clipboard.copied ? (
          <CheckIcon style={{ width: "1em", height: "1em" }} />
        ) : (
          <ClipboardIcon style={{ width: "1em", height: "1em" }} />
        )}
      </button>
    </Tooltip>
  );
};
