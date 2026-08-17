import { cloneElement } from "react";

import { Shortcut } from "./Shortcut";
import { Tooltip, TooltipProps } from "./Tooltip";

export function HotkeyTooltip({
  description,
  keys,
  children,
  keysEnabled = true,
  disabled,
  side,
}: {
  description: React.ReactNode;
  keys: string[];
  // The child only has to accept `aria-keyshortcuts`; it used to be typed
  // against react-aria's `FocusableOptions` because the tooltip made it
  // focusable through that interface, which Base UI's `render` prop replaces.
  children: React.ReactElement<{
    "aria-keyshortcuts"?: React.AriaAttributes["aria-keyshortcuts"];
  }>;
  keysEnabled?: boolean;
  disabled?: boolean;
  side?: TooltipProps["side"];
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
                <Shortcut keys={keys} variant="boxed" />
              </>
            ) : null}
          </div>
        ) : null
      }
      side={side}
    >
      {cloneElement(children, {
        "aria-keyshortcuts": keys.length > 0 ? keys.join("+") : undefined,
      })}
    </Tooltip>
  );
}
