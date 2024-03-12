import { Button as AriakitButton, ButtonProps } from "ariakit/button";
import { clsx } from "clsx";
import { CheckIcon, ClipboardIcon } from "lucide-react";
import { useClipboard } from "use-clipboard-copy";

import { Tooltip } from "./Tooltip";

export const CopyButton = ({
  text,
  onClick,
  className,
  ...props
}: { text: string } & ButtonProps) => {
  const clipboard = useClipboard({ copiedTimeout: 2000 });
  return (
    <Tooltip
      content={clipboard.copied ? "Copied!" : "Copy"}
      preventPointerDownOutside
    >
      <AriakitButton
        {...props}
        className={clsx(
          className,
          "text-low hover:text bg-ui hover:bg-hover cursor-default rounded p-0.5",
        )}
        onClick={(event) => {
          event.preventDefault();
          clipboard.copy(text);
          onClick && onClick(event);
        }}
      >
        {clipboard.copied ? (
          <CheckIcon style={{ width: "1em", height: "1em" }} />
        ) : (
          <ClipboardIcon style={{ width: "1em", height: "1em" }} />
        )}
      </AriakitButton>
    </Tooltip>
  );
};
