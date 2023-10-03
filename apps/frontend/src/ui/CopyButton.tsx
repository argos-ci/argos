import { CheckIcon, ClipboardIcon } from "lucide-react";
import { Button as AriakitButton, ButtonProps } from "ariakit/button";
import clsx from "clsx";
import { useClipboard } from "use-clipboard-copy";
import { Tooltip } from "./Tooltip";

export type CopyButtonProps = { text: string } & ButtonProps;

export const CopyButton = ({
  text,
  onClick,
  className,
  ...props
}: CopyButtonProps) => {
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
          "cursor-default text-low hover:text rounded bg-ui hover:bg-hover p-0.5",
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
