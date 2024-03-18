import { Tooltip, TooltipProps } from "./Tooltip";

export const HotkeyTooltip = ({
  description,
  keys,
  children,
  keysEnabled = true,
  side,
  disabled,
}: {
  description: React.ReactNode;
  keys: string[];
  children: React.ReactElement;
  keysEnabled?: boolean;
  side?: TooltipProps["side"];
  disabled?: boolean;
}) => {
  return (
    <Tooltip
      side={side}
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
    >
      {children}
    </Tooltip>
  );
};
