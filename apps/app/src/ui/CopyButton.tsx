import { CheckIcon, ClipboardDocumentIcon } from "@heroicons/react/24/outline";
import { Button as AriakitButton, ButtonProps } from "ariakit/button";
import { useClipboard } from "use-clipboard-copy";

export type CopyButtonProps = { text: string } & ButtonProps;

export const CopyButton = ({ text, onClick, ...props }: CopyButtonProps) => {
  const clipboard = useClipboard({ copiedTimeout: 3000 });
  return (
    <AriakitButton
      {...props}
      aria-label={clipboard.copied ? "Copied!" : "Copy"}
      onClick={(event) => {
        clipboard.copy(text);
        onClick && onClick(event);
      }}
    >
      {clipboard.copied ? (
        <CheckIcon style={{ width: "1em", height: "1em" }} />
      ) : (
        <ClipboardDocumentIcon style={{ width: "1em", height: "1em" }} />
      )}
    </AriakitButton>
  );
};
