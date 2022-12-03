import { forwardRef } from "react";

import { MagicTooltip } from "./Tooltip";

export interface HotkeyTooltipProps {
  description: React.ReactNode;
  keys: string[];
  children: React.ReactElement;
  keysEnabled?: boolean;
}

export const HotkeyTooltip = forwardRef<HTMLDivElement, HotkeyTooltipProps>(
  ({ description, keys, children, keysEnabled = true }, ref) => {
    return (
      <MagicTooltip
        ref={ref}
        tooltip={
          <div className="flex items-center gap-1">
            <span>{description}</span>
            {keysEnabled && (
              <>
                <span className="text-on-light">·</span>
                {keys.map((key) => (
                  <kbd
                    key={key}
                    className="inline-flex h-4 min-w-[1rem] items-center justify-center rounded bg-slate-700 px-1 text-xxs text-slate-300"
                  >
                    {key}
                  </kbd>
                ))}
              </>
            )}
          </div>
        }
      >
        {children}
      </MagicTooltip>
    );
  }
);
