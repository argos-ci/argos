import { Button as AriakitButton } from "ariakit/button";
import { clsx } from "clsx";
import { memo } from "react";

import type { BuildStats } from "@/modern/containers/Build";
import { HotkeyTooltip } from "@/modern/ui/HotkeyTooltip";
import { MagicTooltip } from "@/modern/ui/Tooltip";

import {
  GROUPS,
  getGroupColor,
  getGroupIcon,
  getGroupLabel,
} from "./BuildDiffGroup";
import type { DiffGroup } from "./BuildDiffState";
import { HotkeyName, useBuildHotkey } from "./BuildHotkeys";

type StatCountColor = "danger" | "warning" | "success" | "neutral";

const getStatCountColorClassName = (
  color: StatCountColor,
  interactive: boolean
) => {
  switch (color) {
    case "danger":
      return clsx("text-danger-600", interactive && "hover:text-danger-400");
    case "warning":
      return clsx("text-warning-600", interactive && "hover:text-warning-400");
    case "success":
      return clsx("text-success-600", interactive && "hover:text-success-400");
    case "neutral":
    default:
      return clsx("text-neutral-400", interactive && "hover:text-neutral-200");
  }
};

const getStatHotkeyName = (group: DiffGroup["name"]): HotkeyName => {
  switch (group) {
    case "failure":
      return "goToFirstFailure";
    case "changed":
      return "goToFirstChanged";
    case "added":
      return "goToFirstAdded";
    case "removed":
      return "goToFirstRemoved";
    case "unchanged":
      return "goToFirstUnchanged";
    default:
      throw new Error(`Unknown group: ${group}`);
  }
};

interface InteractiveStatCountProps {
  icon: React.ReactNode;
  count: number;
  color: StatCountColor;
  onActive: () => void;
  hotkeyName: HotkeyName;
}

const InteractiveStatCount = ({
  icon,
  count,
  color,
  onActive,
  hotkeyName,
}: InteractiveStatCountProps) => {
  const colorClassName = getStatCountColorClassName(color, true);
  const hotkey = useBuildHotkey(hotkeyName, onActive);
  return (
    <HotkeyTooltip keys={hotkey.displayKeys} description={hotkey.description}>
      <AriakitButton
        as="div"
        className={clsx(
          colorClassName,
          "flex cursor-default items-center gap-1 p-2 transition aria-disabled:opacity-70"
        )}
        onClick={onActive}
        disabled={count === 0}
      >
        <span className="[&>*]:h-4 [&>*]:w-4">{icon}</span>
        <span className="text-xs">{count}</span>
      </AriakitButton>
    </HotkeyTooltip>
  );
};

interface StatCountProps {
  icon: React.ReactNode;
  count: number;
  color: StatCountColor;
  tooltip: string;
}

const StatCount = ({ icon, count, color, tooltip }: StatCountProps) => {
  const colorClassName = getStatCountColorClassName(color, false);
  return (
    <MagicTooltip tooltip={tooltip}>
      <div
        className={clsx(
          colorClassName,
          "flex w-16 items-center gap-1 tabular-nums"
        )}
      >
        <span className="[&>*]:h-4 [&>*]:w-4">{icon}</span>
        <span className="text-xs">{count}</span>
      </div>
    </MagicTooltip>
  );
};

export interface BuildStatsIndicatorProps {
  stats: BuildStats;
  onClickGroup?: (group: DiffGroup["name"]) => void;
  className?: string;
}

export const BuildStatsIndicator = memo(
  ({ stats, onClickGroup, className }: BuildStatsIndicatorProps) => {
    return (
      <div className={clsx(className, "flex items-center")}>
        {GROUPS.map((group) => {
          const count = stats[group];
          if (!onClickGroup) {
            return (
              <StatCount
                key={group}
                icon={getGroupIcon(group)}
                count={count}
                color={getGroupColor(group)}
                tooltip={getGroupLabel(group)}
              />
            );
          }
          return (
            <InteractiveStatCount
              key={group}
              icon={getGroupIcon(group)}
              count={count}
              color={getGroupColor(group)}
              onActive={() => onClickGroup(group)}
              hotkeyName={getStatHotkeyName(group)}
            />
          );
        })}
      </div>
    );
  }
);
