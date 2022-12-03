import { Button as AriakitButton } from "ariakit/button";
import { clsx } from "clsx";
import { memo } from "react";

import type { BuildStats } from "@/modern/containers/Build";
import { HotkeyTooltip } from "@/modern/ui/HotkeyTooltip";

import { GROUPS, getGroupColor, getGroupIcon } from "./BuildDiffGroup";
import type { DiffGroup } from "./BuildDiffState";
import { HotkeyName, useBuildHotkey } from "./BuildHotkeys";

type StatCountColor = "danger" | "warning" | "success" | "neutral";

const getStatCountColorClassName = (color: StatCountColor) => {
  switch (color) {
    case "danger":
      return "text-danger-600 hover:text-danger-400";
    case "warning":
      return "text-warning-600 hover:text-warning-400";
    case "success":
      return "text-success-600 hover:text-success-400";
    case "neutral":
    default:
      return "text-neutral-400 hover:text-neutral-200";
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

interface StatCountProps {
  icon: React.ReactNode;
  count: number;
  color: StatCountColor;
  onActive: () => void;
  hotkeyName: HotkeyName;
}

const StatCount = ({
  icon,
  count,
  color,
  onActive,
  hotkeyName,
}: StatCountProps) => {
  const colorClassName = getStatCountColorClassName(color);
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

export interface BuildStatsIndicatorProps {
  stats: BuildStats;
  onClickGroup: (group: DiffGroup["name"]) => void;
}

export const BuildStatsIndicator = memo(
  ({ stats, onClickGroup }: BuildStatsIndicatorProps) => {
    return (
      <div className="flex flex-shrink-0 items-center border-b border-b-border px-2">
        {GROUPS.map((group) => {
          const count = stats[group];
          return (
            <StatCount
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
