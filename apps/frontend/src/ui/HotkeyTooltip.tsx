import { cloneElement } from "react";
import { FocusableOptions } from "react-aria";

import { Kbd } from "./Kbd";
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
  children: React.ReactElement<
    FocusableOptions & {
      "aria-keyshortcuts"?: React.AriaAttributes["aria-keyshortcuts"];
    }
  >;
  keysEnabled?: boolean;
  disabled?: boolean;
  placement?: TooltipProps["placement"];
}) {
  return (
    <Tooltip
      content={
        !disabled ? (
          <div className="flex items-center gap-1">
            <span>{description}</span>
            {keysEnabled && keys.length > 0 ? (
              <>
                <span className="text-low">·</span>
                {keys.map((key) => (
                  <Kbd key={key}>{key}</Kbd>
                ))}
              </>
            ) : null}
          </div>
        ) : null
      }
      placement={placement}
    >
      {cloneElement(children, {
        "aria-keyshortcuts": keys.length > 0 ? keys.join("+") : undefined,
      })}
    </Tooltip>
  );
}
