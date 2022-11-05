import { HTMLAttributes, memo } from "react";
import { Button as AriakitButton } from "ariakit/button";
import type { BuildStats } from "@/modern/containers/Build";
import type { DiffGroup } from "./BuildDiffState";
import { getGroupColor, getGroupIcon, GROUPS } from "./BuildDiffGroup";

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

interface StatCountProps {
  icon: React.ReactNode;
  count: number;
  color: StatCountColor;
  onClick: HTMLAttributes<HTMLDivElement>["onClick"];
}

const StatCount = ({ icon, count, color, onClick }: StatCountProps) => {
  const colorClassName = getStatCountColorClassName(color);
  return (
    <AriakitButton
      as="div"
      className={`${colorClassName} flex cursor-default items-center gap-1 p-2 transition aria-disabled:opacity-70`}
      onClick={onClick}
      disabled={count === 0}
    >
      <span className="[&>*]:h-4 [&>*]:w-4">{icon}</span>
      <span className="text-xs">{count}</span>
    </AriakitButton>
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
              onClick={() => onClickGroup(group)}
            />
          );
        })}
      </div>
    );
  }
);
