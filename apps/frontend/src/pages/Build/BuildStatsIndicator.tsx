import { Fragment, memo } from "react";
import { assertNever } from "@argos/util/assertNever";
import { clsx } from "clsx";
import { Button as RACButton } from "react-aria-components";

import {
  DIFF_GROUPS,
  getGroupColor,
  getGroupIcon,
  getGroupLabel,
  type DiffGroupName,
} from "@/containers/Build/BuildDiffGroup";
import {
  useBuildHotkey,
  type HotkeyName,
} from "@/containers/Build/BuildHotkeys";
import { DocumentType, graphql } from "@/gql";
import { ScreenshotDiffStatus } from "@/gql/graphql";
import { HotkeyTooltip } from "@/ui/HotkeyTooltip";
import { Tooltip } from "@/ui/Tooltip";

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

const getStatHotkeyName = (group: DiffGroupName): HotkeyName => {
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
    case ScreenshotDiffStatus.Ignored:
      return "goToFirstIgnored";
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
          "data-[disabled]:opacity-disabled rac-focus flex cursor-default items-center gap-1 py-2 transition",
        )}
        onPress={onActive}
        isDisabled={count === 0}
      >
        <span className="*:size-3">{icon}</span>
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
      <span className="*:size-4">{icon}</span>
      <span className="text-xs">{count}</span>
    </div>
  );
  if (!tooltip) {
    return element;
  }
  return <Tooltip content={tooltip}>{element}</Tooltip>;
}

const _BuildStatsFragment = graphql(`
  fragment BuildStatsIndicator_BuildStats on BuildStats {
    total
    failure
    changed
    added
    removed
    unchanged
    retryFailure
    ignored
  }
`);

export const BuildStatsIndicator = memo(function BuildStatsIndicator({
  stats,
  onClickGroup,
  className,
  tooltip = true,
}: {
  stats: DocumentType<typeof _BuildStatsFragment>;
  onClickGroup?: (group: DiffGroupName) => void;
  className?: string;
  tooltip?: boolean;
}) {
  const groups = DIFF_GROUPS.map((group) => {
    const count = stats[group];
    if (count === 0) {
      return null;
    }
    return (
      <Fragment key={group}>
        {onClickGroup ? (
          <InteractiveStatCount
            icon={getGroupIcon(group)}
            count={count}
            color={getGroupColor(group)}
            onActive={() => onClickGroup(group)}
            hotkeyName={getStatHotkeyName(group)}
          />
        ) : (
          <StatCount
            icon={getGroupIcon(group)}
            count={count}
            color={getGroupColor(group)}
            tooltip={tooltip ? getGroupLabel(group) : null}
          />
        )}
        <span className="text-xs text-(--mauve-7) select-none last:hidden">
          •
        </span>
      </Fragment>
    );
  }).filter((x) => x !== null);
  if (groups.length === 0) {
    return null;
  }
  return (
    <div className={clsx("flex items-center gap-1.5", className)}>{groups}</div>
  );
});
