import {
  AlertCircleIcon,
  CheckCircle2Icon,
  FlagOffIcon,
  MinusCircleIcon,
  PlusCircleIcon,
  RotateCcwIcon,
  SquareSlashIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  XCircleIcon,
  type LucideIcon,
} from "lucide-react";

import { ScreenshotDiffStatus } from "@/gql/graphql";
import { EvaluationStatus } from "@/pages/Build/EvaluationStatus";

import type { BuildDiffDetailDocument } from "./BuildDiffDetail";

/**
 * Where a subset build lists the baseline snapshots it did not upload. Such a
 * build only runs part of the tests, so a missing snapshot was not run rather
 * than removed.
 */
export const SKIPPED_DIFF_GROUP = "skipped";

export const DIFF_GROUPS = [
  ScreenshotDiffStatus.Failure,
  ScreenshotDiffStatus.Changed,
  ScreenshotDiffStatus.Added,
  ScreenshotDiffStatus.Removed,
  EvaluationStatus.Accepted,
  EvaluationStatus.Rejected,
  ScreenshotDiffStatus.Unchanged,
  ScreenshotDiffStatus.RetryFailure,
  ScreenshotDiffStatus.Ignored,
  SKIPPED_DIFF_GROUP,
] as const;

export const DIFF_STATS_GROUPS = DIFF_GROUPS.filter(
  (group) =>
    group !== EvaluationStatus.Accepted &&
    group !== EvaluationStatus.Rejected &&
    group !== SKIPPED_DIFF_GROUP,
);

export type DiffGroupName = (typeof DIFF_GROUPS)[number];
export type DiffStatusGroupName = (typeof DIFF_STATS_GROUPS)[number];

export interface DiffGroup<TDiff = BuildDiffDetailDocument> {
  name: DiffGroupName;
  diffs: (TDiff | null)[];
}

export function checkIsDiffGroupName(value: unknown): value is DiffGroupName {
  return DIFF_GROUPS.includes(value as DiffGroupName);
}

/**
 * The group a status puts a snapshot in. Name statuses through it rather than
 * reading them raw, so a snapshot a subset build skipped never reads as removed.
 */
export function getDiffStatusGroup(
  status: ScreenshotDiffStatus,
  context: { isSubsetBuild: boolean },
): ScreenshotDiffStatus | typeof SKIPPED_DIFF_GROUP {
  if (context.isSubsetBuild && status === ScreenshotDiffStatus.Removed) {
    return SKIPPED_DIFF_GROUP;
  }
  return status;
}

export type DiffGroupColor = "danger" | "warning" | "success" | "neutral";

type DiffGroupDefinition = {
  color: DiffGroupColor;
  label: string;
  icon: LucideIcon;
};

const DiffGroupDefinitions: Record<DiffGroupName, DiffGroupDefinition> = {
  [ScreenshotDiffStatus.Failure]: {
    color: "danger",
    label: "Framework test failures",
    icon: XCircleIcon,
  },
  [ScreenshotDiffStatus.RetryFailure]: {
    color: "neutral",
    label: "Framework retried failures",
    icon: RotateCcwIcon,
  },
  [ScreenshotDiffStatus.Changed]: {
    color: "warning",
    label: "Changed",
    icon: AlertCircleIcon,
  },
  [ScreenshotDiffStatus.Added]: {
    color: "warning",
    label: "Added",
    icon: PlusCircleIcon,
  },
  [ScreenshotDiffStatus.Removed]: {
    color: "warning",
    label: "Removed",
    icon: MinusCircleIcon,
  },
  [SKIPPED_DIFF_GROUP]: {
    color: "neutral",
    label: "Skipped",
    icon: SquareSlashIcon,
  },
  [ScreenshotDiffStatus.Ignored]: {
    color: "neutral",
    label: "Ignored",
    icon: FlagOffIcon,
  },
  [ScreenshotDiffStatus.Unchanged]: {
    color: "success",
    label: "Unchanged",
    icon: CheckCircle2Icon,
  },
  [EvaluationStatus.Rejected]: {
    color: "danger",
    label: "Rejected",
    icon: ThumbsDownIcon,
  },
  [EvaluationStatus.Accepted]: {
    color: "success",
    label: "Accepted",
    icon: ThumbsUpIcon,
  },
};

export function getDiffGroupDefinition(
  diffGroupName: DiffGroupName,
): DiffGroupDefinition {
  return DiffGroupDefinitions[diffGroupName];
}
