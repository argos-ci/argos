import { useBuildHotkey } from "@/containers/Build/BuildHotkeys";
import { useEventCallback } from "@/ui/useEventCallback";

import { useBuildDiffState, type Diff } from "./BuildDiffState";
import {
  useBuildReviewAPI,
  type AppliedReviewMarkChange,
  type BuildReviewAPI,
} from "./BuildReviewState";
import { EvaluationStatus } from "./EvaluationStatus";
import {
  showReviewMarkToast,
  type ReviewMarkToastProps,
} from "./ReviewMarkToast";

/**
 * Name the snapshot a marking touched, or count them when it marked a group or
 * reapplied previous approvals.
 */
function getSubject(change: AppliedReviewMarkChange, allDiffs: Diff[]): string {
  const count = Object.keys(change.statuses).length;
  if (count > 1) {
    return `${count} snapshots`;
  }
  // Every loaded diff, not the filtered list: a search typed since the marking
  // hides the snapshot from the list, not from what the reviewer did.
  const diff = allDiffs.find((diff) => diff.id === change.diffId);
  // Previous approvals can name a diff from a page that has not loaded yet.
  return diff ? diff.name : "1 snapshot";
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
  const { diffs, allDiffs, setActiveDiff } = useBuildDiffState();

  const apply = useEventCallback(
    (
      move: ReviewMarkToastProps["move"],
      change: AppliedReviewMarkChange | null,
    ) => {
      if (!change) {
        return;
      }
      const diff = diffs.find((diff) => diff.id === change.diffId);
      if (diff) {
        setActiveDiff(diff, true);
      }
      showReviewMarkToast({
        move,
        mark: change.mark,
        subject: getSubject(change, allDiffs),
        takesBackRejection: checkTakesBackRejection(change),
      });
    },
  );

  useBuildHotkey("undoReviewMark", () => apply("undo", api.undo()));
  useBuildHotkey("redoReviewMark", () => apply("redo", api.redo()));

  return null;
}
