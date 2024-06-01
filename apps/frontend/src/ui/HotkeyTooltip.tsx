import { cloneElement } from "react";

import { Tooltip, TooltipProps } from "./Tooltip";

export function HotkeyTooltip({
  description,
  keys,
  children,
  keysEnabled = true,
  disabled,
  placement,
}: {
  description: React.ReactNode;
  keys: string[];
  children: React.ReactElement;
  keysEnabled?: boolean;
  disabled?: boolean;
  placement?: TooltipProps["placement"];
}) {
  return (
    <Tooltip
      content={
        !disabled && (
          <div className="flex items-center gap-1">
            <span>{description}</span>
            {keysEnabled && (
              <>
                <span className="text-low">·</span>
                {keys.map((key) => (
                  <kbd
                    key={key}
                    className="bg-active text-xxs text inline-flex h-4 min-w-4 items-center justify-center rounded px-1"
                  >
                    {key}
                  </kbd>
                ))}
              </>
            )}
          </div>
        )
      }
      placement={placement}
    >
      {cloneElement(children, { "aria-keyshortcuts": keys.join("+") })}
    </Tooltip>
  );
}
