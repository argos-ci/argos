import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";

import { useBuildHotkey } from "@/containers/Build/BuildHotkeys";
import { toast } from "@/ui/Toaster";
import { useEventCallback } from "@/ui/useEventCallback";

import { useBuildDiffState } from "./BuildDiffState";
import {
  useBuildReviewAPI,
  type AppliedReviewMarkChange,
  type BuildReviewAPI,
} from "./BuildReviewState";
import { EvaluationStatus } from "./EvaluationStatus";

/**
 * Sum up what an undo or a redo wrote, from the reviewer's point of view: the
 * state the changes are in *now*, not the one they came from.
 */
function describeAppliedChange(change: AppliedReviewMarkChange): string {
  const statuses = Object.values(change.statuses);
  const [firstStatus] = statuses;
  invariant(firstStatus, "A marking always touches at least one diff");
  const count = statuses.length;
  const noun = count === 1 ? "change" : "changes";
  if (statuses.some((status) => status !== firstStatus)) {
    return `${count} review marks restored`;
  }
  switch (firstStatus) {
    case EvaluationStatus.Accepted:
      return `${count} ${noun} marked as accepted`;
    case EvaluationStatus.Rejected:
      return `${count} ${noun} marked as rejected`;
    case EvaluationStatus.Pending:
      return count === 1
        ? "1 change is pending review again"
        : `${count} changes are pending review again`;
    default:
      assertNever(firstStatus);
  }
}

/**
 * Rejecting invites the reviewer to write a note, which is a build comment the
 * moment they submit it. Taking the rejection back leaves that note behind —
 * it is on the server, where the undo stack deliberately does not reach — so
 * the snapshot would otherwise carry a written justification for a rejection
 * that no longer exists, with nothing saying so.
 */
function checkTakesBackRejection(change: AppliedReviewMarkChange): boolean {
  return Object.entries(change.replaced).some(
    ([diffId, status]) =>
      status === EvaluationStatus.Rejected &&
      change.statuses[diffId] !== EvaluationStatus.Rejected,
  );
}

/**
 * Undo (⌘Z) and redo (⌘⇧Z) over the review marks of the current build.
 *
 * The reviewer marks a snapshot and is taken straight to the next one, so a
 * mistake is noticed one snapshot too late. Undo puts the mark back as it was
 * *and* brings the snapshot it belongs to back on screen, so the correction is
 * made where it can be seen.
 */
export function BuildReviewUndoHotkeys() {
  const api = useBuildReviewAPI();
  // A reference build is not reviewed, so it has no marks and nothing to undo.
  if (!api) {
    return null;
  }
  return <UndoHotkeys api={api} />;
}

function UndoHotkeys(props: { api: BuildReviewAPI }) {
  const { api } = props;
  const { diffs, setActiveDiff } = useBuildDiffState();

  const apply = useEventCallback((change: AppliedReviewMarkChange | null) => {
    if (!change) {
      return;
    }
    const diff = diffs.find((diff) => diff.id === change.diffId);
    if (diff) {
      setActiveDiff(diff, true);
    }
    toast.success(describeAppliedChange(change), {
      description: checkTakesBackRejection(change)
        ? "Any note you left explaining the rejection stays on the snapshot."
        : undefined,
    });
  });

  useBuildHotkey("undoReviewMark", () => apply(api.undo()));
  useBuildHotkey("redoReviewMark", () => apply(api.redo()));

  return null;
}
