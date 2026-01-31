import { Fragment, memo } from "react";
import { assertNever } from "@argos/util/assertNever";
import { clsx } from "clsx";
import type { LucideIcon } from "lucide-react";
import { Button as RACButton } from "react-aria-components";

import {
  DIFF_STATS_GROUPS,
  getDiffGroupDefinition,
  type DiffGroupColor,
  type DiffGroupName,
  type DiffStatusGroupName,
} from "@/containers/Build/BuildDiffGroup";
import {
  useBuildHotkey,
  type HotkeyName,
} from "@/containers/Build/BuildHotkeys";
import { DocumentType, graphql } from "@/gql";
import { ScreenshotDiffStatus } from "@/gql/graphql";
import { HotkeyTooltip } from "@/ui/HotkeyTooltip";
import { Tooltip } from "@/ui/Tooltip";

const getStatCountColorClassName = (
  color: DiffGroupColor,
  interactive: boolean,
) => {
  switch (color) {
    case "danger":
      return clsx("text-danger-low", interactive && "data-hovered:text-danger");
    case "warning":
      return clsx(
        "text-warning-low",
        interactive && "data-hovered:text-warning",
      );
    case "success":
      return clsx(
        "text-success-low",
        interactive && "data-hovered:text-success",
      );
    case "neutral":
    default:
      return clsx("text-low", interactive && "data-hovered:text");
  }
};

function getStatHotkeyName(group: DiffStatusGroupName): HotkeyName {
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
}

interface InteractiveStatCountProps {
  icon: LucideIcon;
  count: number;
  color: DiffGroupColor;
  onActive: () => void;
  hotkeyName: HotkeyName;
}

function InteractiveStatCount({
  icon: Icon,
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
          "data-disabled:opacity-disabled rac-focus flex cursor-default items-center gap-1 py-2 transition",
        )}
        onPress={onActive}
        isDisabled={count === 0}
      >
        <Icon className="size-3" />
        <span className="text-xs">{count}</span>
      </RACButton>
    </HotkeyTooltip>
  );
}

interface StatCountProps {
  icon: LucideIcon;
  count: number;
  color: DiffGroupColor;
  tooltip: string | null;
}

function StatCount({ icon: Icon, count, color, tooltip }: StatCountProps) {
  const colorClassName = getStatCountColorClassName(color, false);
  const element = (
    <div
      className={clsx(
        colorClassName,
        "flex items-center gap-1 tabular-nums",
        count === 0 && "opacity-disabled",
      )}
    >
      <Icon className="size-4" />
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

export const BuildStatsIndicator = memo(function BuildStatsIndicator(props: {
  stats: DocumentType<typeof _BuildStatsFragment>;
  onClickGroup?: (group: DiffGroupName) => void;
  className?: string;
  /**
   * Indicates if the stats comes from a build marked as subset.
   */
  isSubsetBuild: boolean;
  /**
   * Add tooltips.
   * @default true
   */
  tooltip?: boolean;
}) {
  const {
    stats,
    onClickGroup,
    className,
    isSubsetBuild,
    tooltip = true,
  } = props;
  const groups = DIFF_STATS_GROUPS.map((group) => {
    const count = stats[group];
    if (count === 0) {
      return null;
    }
    const def = getDiffGroupDefinition(group, { isSubsetBuild });
    return (
      <Fragment key={group}>
        {onClickGroup ? (
          <InteractiveStatCount
            icon={def.icon}
            count={count}
            color={def.color}
            onActive={() => onClickGroup(group)}
            hotkeyName={getStatHotkeyName(group)}
          />
        ) : (
          <StatCount
            icon={def.icon}
            count={count}
            color={def.color}
            tooltip={tooltip ? def.label : null}
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
