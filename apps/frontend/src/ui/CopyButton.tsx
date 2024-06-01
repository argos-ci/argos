import { useState } from "react";
import { clsx } from "clsx";
import { CheckIcon, CopyIcon } from "lucide-react";
import { Button, ButtonProps } from "react-aria-components";
import { useClipboard } from "use-clipboard-copy";

import { Tooltip } from "./Tooltip";

export function CopyButton({
  text,
  className,
  ...props
}: ButtonProps & { text: string }) {
  const clipboard = useClipboard({ copiedTimeout: 2000 });
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);
  return (
    <Tooltip
      content={clipboard.copied ? "Copied!" : "Copy"}
      isOpen={clipboard.copied || isTooltipOpen}
      onOpenChange={setIsTooltipOpen}
    >
      <Button
        className={clsx(
          "text-low data-[hovered]:text bg-ui data-[hovered]:bg-hover data-[pressed]:bg-active data-[focus-visible]:ring-default cursor-default rounded p-1 transition focus:outline-none data-[focus-visible]:ring-4",
          className,
        )}
        onPress={() => {
          clipboard.copy(text);
        }}
        {...props}
      >
        <div className="relative size-[1em] overflow-hidden">
          <div
            className={clsx(
              "absolute flex flex-col transition",
              clipboard.copied && "translate-y-[-1em]",
            )}
          >
            <CopyIcon
              className={clsx(
                "size-[1em] transition",
                clipboard.copied && "opacity-0",
              )}
            />
            <CheckIcon className="size-[1em]" />
          </div>
        </div>
      </Button>
    </Tooltip>
  );
}
