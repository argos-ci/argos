import { memo } from "react";
import { assertNever } from "@argos/util/assertNever";
import { clsx } from "clsx";
import { Button as RACButton } from "react-aria-components";

import { FragmentType, graphql, useFragment } from "@/gql";
import { ScreenshotDiffStatus } from "@/gql/graphql";
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
      return clsx(
        "text-danger-low",
        interactive && "data-[hovered]:text-danger",
      );
    case "warning":
      return clsx(
        "text-warning-low",
        interactive && "data-[hovered]:text-warning",
      );
    case "success":
      return clsx(
        "text-success-low",
        interactive && "data-[hovered]:text-success",
      );
    case "neutral":
    default:
      return clsx("text-low", interactive && "data-[hovered]:text");
  }
};

const getStatHotkeyName = (group: DiffGroup["name"]): HotkeyName => {
  switch (group) {
    case ScreenshotDiffStatus.Failure:
      return "goToFirstFailure";
    case ScreenshotDiffStatus.Changed:
      return "goToFirstChanged";
    case ScreenshotDiffStatus.Added:
      return "goToFirstAdded";
    case ScreenshotDiffStatus.Removed:
      return "goToFirstRemoved";
    case ScreenshotDiffStatus.Unchanged:
      return "goToFirstUnchanged";
    case ScreenshotDiffStatus.RetryFailure:
      return "goToFirstRetryFailure";
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

function InteractiveStatCount({
  icon,
  count,
  color,
  onActive,
  hotkeyName,
}: InteractiveStatCountProps) {
  const colorClassName = getStatCountColorClassName(color, true);
  const hotkey = useBuildHotkey(hotkeyName, onActive);
  return (
    <HotkeyTooltip keys={hotkey.displayKeys} description={hotkey.description}>
      <RACButton
        className={clsx(
          colorClassName,
          "data-[disabled]:opacity-disabled rac-focus flex cursor-default items-center gap-1 p-2 transition",
        )}
        onPress={onActive}
        isDisabled={count === 0}
      >
        <span className="[&>*]:size-4">{icon}</span>
        <span className="text-xs">{count}</span>
      </RACButton>
    </HotkeyTooltip>
  );
}

interface StatCountProps {
  icon: React.ReactNode;
  count: number;
  color: StatCountColor;
  tooltip: string | null;
}

function StatCount({ icon, count, color, tooltip }: StatCountProps) {
  const colorClassName = getStatCountColorClassName(color, false);
  const element = (
    <div
      className={clsx(
        colorClassName,
        "flex items-center gap-1 tabular-nums",
        count === 0 && "opacity-disabled",
      )}
    >
      <span className="[&>*]:size-4">{icon}</span>
      <span className="text-xs">{count}</span>
    </div>
  );
  if (!tooltip) {
    return element;
  }
  return <Tooltip content={tooltip}>{element}</Tooltip>;
}

const BuildStatsFragment = graphql(`
  fragment BuildStatsIndicator_BuildStats on BuildStats {
    total
    failure
    changed
    added
    removed
    unchanged
    retryFailure
  }
`);

export const BuildStatsIndicator = memo(function BuildStatsIndicator({
  stats: rawStats,
  onClickGroup,
  className,
  tooltip = true,
}: {
  stats: FragmentType<typeof BuildStatsFragment>;
  onClickGroup?: (group: DiffGroup["name"]) => void;
  className?: string;
  tooltip?: boolean;
}) {
  const stats = useFragment(BuildStatsFragment, rawStats);
  return (
    <div className={clsx(className, "flex items-center")}>
      {GROUPS.map((group) => {
        const count = stats[group];
        if (!onClickGroup) {
          if (count === 0) {
            return null;
          }
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
});
