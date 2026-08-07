import {
  AlertCircleIcon,
  CheckCircle2Icon,
  FlagOffIcon,
  MinusCircleIcon,
  PlusCircleIcon,
  RotateCcwIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  XCircleIcon,
  type LucideIcon,
} from "lucide-react";

import { ScreenshotDiffStatus } from "@/gql/graphql";
import { EvaluationStatus } from "@/pages/Build/EvaluationStatus";

import type { BuildDiffDetailDocument } from "./BuildDiffDetail";

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
] as const;

export const DIFF_STATS_GROUPS = DIFF_GROUPS.filter(
  (group) =>
    group !== EvaluationStatus.Accepted && group !== EvaluationStatus.Rejected,
);

export type DiffGroupName = (typeof DIFF_GROUPS)[number];
export type DiffStatusGroupName = (typeof DIFF_STATS_GROUPS)[number];

type DiffGroupFlow = {
  /** Flow key ("" for the catch-all group of non-flow screenshots). */
  key: string;
  prefix: string;
  title: string;
  /** Number of diffs that need attention (changed, added, removed, failure). */
  changedCount: number;
};

export interface DiffGroup<TDiff = BuildDiffDetailDocument> {
  /** A status group name, or a `flow:`-prefixed key in flow grouping mode. */
  name: DiffGroupName | (string & {});
  diffs: (TDiff | null)[];
  /** Set when the group represents a user flow instead of a status. */
  flow?: DiffGroupFlow;
}

export function checkIsDiffGroupName(value: unknown): value is DiffGroupName {
  return DIFF_GROUPS.includes(value as DiffGroupName);
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
