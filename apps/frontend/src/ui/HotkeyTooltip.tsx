import { Tooltip, TooltipProps } from "./Tooltip";

export const HotkeyTooltip = ({
  description,
  keys,
  children,
  keysEnabled = true,
  side,
}: {
  description: React.ReactNode;
  keys: string[];
  children: React.ReactElement;
  keysEnabled?: boolean;
  side?: TooltipProps["side"];
}) => {
  return (
    <Tooltip
      side={side}
      content={
        <div className="flex items-center gap-1">
          <span>{description}</span>
          {keysEnabled && (
            <>
              <span className="text-low">·</span>
              {keys.map((key) => (
                <kbd
                  key={key}
                  className="inline-flex h-4 min-w-[1rem] items-center justify-center rounded bg-active px-1 text-xxs text"
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
    </Tooltip>
  );
};
