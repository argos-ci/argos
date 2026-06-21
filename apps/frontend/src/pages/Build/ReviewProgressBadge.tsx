import {
  EllipsisIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  type LucideIcon,
} from "lucide-react";

import { Chip, type ChipColor } from "@/ui/Chip";
import { Tooltip } from "@/ui/Tooltip";

import { checkDiffCanBeReviewed, useBuildDiffState } from "./BuildDiffState";
import { useGetDiffEvaluationStatus } from "./BuildReviewState";
import { EvaluationStatus } from "./EvaluationStatus";

/**
 * Compute how many reviewable diffs the current user has evaluated, split by
 * outcome. Returns `null` while the diff/review state is still initializing.
 */
export function useBuildReviewProgression() {
  const diffState = useBuildDiffState();
  const getDiffEvaluationStatus = useGetDiffEvaluationStatus();
  if (diffState.ready && getDiffEvaluationStatus) {
    const toReview = diffState.allDiffs.filter((diff) =>
      checkDiffCanBeReviewed(diff.status, {
        isSubsetBuild: diffState.isSubsetBuild,
      }),
    );
    const reviewed = toReview.filter(
      (diff) => getDiffEvaluationStatus(diff.id) !== EvaluationStatus.Pending,
    );
    const accepted = toReview.filter(
      (diff) => getDiffEvaluationStatus(diff.id) === EvaluationStatus.Accepted,
    );
    const rejected = toReview.filter(
      (diff) => getDiffEvaluationStatus(diff.id) === EvaluationStatus.Rejected,
    );
    return { toReview, reviewed, accepted, rejected };
  }
  return null;
}

export type BuildReviewProgression = NonNullable<
  ReturnType<typeof useBuildReviewProgression>
>;

function getProgressionDisplay(progression: BuildReviewProgression): {
  color: ChipColor;
  tooltip: string;
  icon: LucideIcon;
} {
  if (progression.rejected.length > 0) {
    return {
      color: "danger",
      tooltip: "Some changes have been rejected",
      icon: ThumbsDownIcon,
    };
  }
  if (progression.reviewed.length === progression.toReview.length) {
    return {
      color: "success",
      tooltip: "All changes have been accepted",
      icon: ThumbsUpIcon,
    };
  }
  return {
    color: "neutral",
    tooltip: "Track your review progress",
    icon: EllipsisIcon,
  };
}

/**
 * Compact "X / Y reviewed" counter chip summarizing the viewer's review
 * progress. Renders nothing until there is at least one diff to review.
 *
 * The chip is sized to its host: `xs` in the build header, `sm` in the
 * review form.
 */
export function ReviewProgressBadge(props: { scale?: "xs" | "sm" }) {
  const { scale = "sm" } = props;
  const progression = useBuildReviewProgression();
  if (!progression || progression.toReview.length === 0) {
    return null;
  }
  const { color, tooltip, icon } = getProgressionDisplay(progression);
  return (
    <Tooltip content={tooltip}>
      <Chip scale={scale} color={color} className="tabular-nums" icon={icon}>
        {progression.reviewed.length} / {progression.toReview.length} reviewed
      </Chip>
    </Tooltip>
  );
}
