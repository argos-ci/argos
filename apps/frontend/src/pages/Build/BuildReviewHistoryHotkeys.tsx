import { useBuildHotkey } from "@/containers/Build/BuildHotkeys";
import { toast } from "@/ui/Toaster";
import { useEventCallback } from "@/ui/useEventCallback";

import { useBuildDiffState } from "./BuildDiffState";
import {
  useBuildReviewHistory,
  type AppliedReviewMarkChange,
} from "./BuildReviewState";
import { EvaluationStatus } from "./EvaluationStatus";

/**
 * Sum up what an undo or a redo wrote, from the reviewer's point of view: the
 * state the changes are in *now*, not the one they came from.
 */
function describeAppliedChange(change: AppliedReviewMarkChange): string {
  const statuses = Object.values(change.statuses);
  const count = statuses.length;
  const noun = count === 1 ? "change" : "changes";
  const isUniform = statuses.every((status) => status === statuses[0]);
  if (!isUniform) {
    return `${count} review marks restored`;
  }
  switch (statuses[0]) {
    case EvaluationStatus.Accepted:
      return `${count} ${noun} marked as accepted`;
    case EvaluationStatus.Rejected:
      return `${count} ${noun} marked as rejected`;
    default:
      return count === 1
        ? "1 change is pending review again"
        : `${count} changes are pending review again`;
  }
}

/**
 * Undo (⌘Z) and redo (⌘⇧Z) over the review marks of the current build.
 *
 * The reviewer marks a snapshot and is taken straight to the next one, so a
 * mistake is noticed one snapshot too late. Undo puts the mark back as it was
 * *and* brings the snapshot it belongs to back on screen, so the correction is
 * made where it can be seen.
 *
 * Only the local marks are on the stack — everything the reviewer builds up
 * before submitting. Actions that already reached the server (submitting the
 * review, ignoring a change) are not undoable this way; each has its own way
 * back.
 */
export function BuildReviewHistoryHotkeys() {
  const history = useBuildReviewHistory();
  const { diffs, setActiveDiff } = useBuildDiffState();

  const apply = useEventCallback((change: AppliedReviewMarkChange | null) => {
    if (!change) {
      return;
    }
    const diff = diffs.find((diff) => diff.id === change.diffId);
    if (diff) {
      setActiveDiff(diff, true);
    }
    toast.success(describeAppliedChange(change));
  });

  // No permission check: a reviewer who cannot mark never records a step, so
  // the stacks stay empty and both keys are no-ops for them.
  const enabled = Boolean(history);
  useBuildHotkey("undoReviewMark", () => apply(history?.undo() ?? null), {
    enabled,
  });
  useBuildHotkey("redoReviewMark", () => apply(history?.redo() ?? null), {
    enabled,
  });

  return null;
}
