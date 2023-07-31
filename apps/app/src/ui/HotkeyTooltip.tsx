import { Tooltip } from "./Tooltip";

export interface HotkeyTooltipProps {
  description: React.ReactNode;
  keys: string[];
  children: React.ReactElement;
  keysEnabled?: boolean;
}

export const HotkeyTooltip = ({
  description,
  keys,
  children,
  keysEnabled = true,
}: HotkeyTooltipProps) => {
  return (
    <Tooltip
      content={
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
    </Tooltip>
  );
};
