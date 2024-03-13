import { memo } from "react";
import { assertNever } from "@argos/util/assertNever";
import { Button as AriakitButton } from "ariakit/button";
import { clsx } from "clsx";

import type { BuildStats } from "@/containers/Build";
import { HotkeyTooltip } from "@/ui/HotkeyTooltip";
import { Tooltip } from "@/ui/Tooltip";

import {
  getGroupColor,
  getGroupIcon,
  getGroupLabel,
  GROUPS,
} from "./BuildDiffGroup";
import type { DiffGroup } from "./BuildDiffState";
import { HotkeyName, useBuildHotkey } from "./BuildHotkeys";

type StatCountColor = "danger" | "warning" | "success" | "neutral";

const getStatCountColorClassName = (
  color: StatCountColor,
  interactive: boolean,
) => {
  switch (color) {
    case "danger":
      return clsx("text-danger-low", interactive && "hover:text-danger");
    case "warning":
      return clsx("text-warning-low", interactive && "hover:text-warning");
    case "success":
      return clsx("text-success-low", interactive && "hover:text-success");
    case "neutral":
    default:
      return clsx("text-low", interactive && "hover:text");
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
      assertNever(group);
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
          "aria-disabled:opacity-disabled flex cursor-default items-center gap-1 p-2 transition",
        )}
        onClick={onActive}
        disabled={count === 0}
      >
        <span className="[&>*]:size-4">{icon}</span>
        <span className="text-xs">{count}</span>
      </AriakitButton>
    </HotkeyTooltip>
  );
};

interface StatCountProps {
  icon: React.ReactNode;
  count: number;
  color: StatCountColor;
  tooltip: string | null;
}

const StatCount = ({ icon, count, color, tooltip }: StatCountProps) => {
  const colorClassName = getStatCountColorClassName(color, false);
  const element = (
    <div
      className={clsx(
        colorClassName,
        "flex w-16 items-center gap-1 tabular-nums",
      )}
    >
      <span className="[&>*]:size-4">{icon}</span>
      <span className="text-xs">{count}</span>
    </div>
  );
  if (!tooltip) return element;
  return <Tooltip content={tooltip}>{element}</Tooltip>;
};

export const BuildStatsIndicator = memo(
  ({
    stats,
    onClickGroup,
    className,
    tooltip = true,
  }: {
    stats: BuildStats;
    onClickGroup?: (group: DiffGroup["name"]) => void;
    className?: string;
    tooltip?: boolean;
  }) => {
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
                tooltip={tooltip ? getGroupLabel(group) : null}
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
  },
);
