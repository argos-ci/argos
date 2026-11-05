import { assertNever } from "@argos/util/assertNever";
import { Redo2Icon, Undo2Icon } from "lucide-react";

import { toast } from "@/ui/Toaster";

import { EvaluationStatus } from "./EvaluationStatus";

export type ReviewMarkToastProps = {
  move: "undo" | "redo";
  /** The marking that was taken back or applied again. */
  mark: EvaluationStatus;
  /** The snapshot's name, or how many snapshots the marking touched. */
  subject: string;
  /** Whether the move took a rejection back, leaving its note behind. */
  takesBackRejection: boolean;
};

function getMarkAction(mark: EvaluationStatus): string {
  switch (mark) {
    case EvaluationStatus.Accepted:
      return "accept";
    case EvaluationStatus.Rejected:
      return "reject";
    // Marking a diff pending is how the reviewer toggles a mark off.
    case EvaluationStatus.Pending:
      return "unmark";
    default:
      assertNever(mark);
  }
}

/**
 * Confirm an undo or a redo of a review mark, naming the marking and the
 * snapshot it touched: "Undo accept homepage.png".
 */
export function showReviewMarkToast(props: ReviewMarkToastProps) {
  const { move, mark, subject, takesBackRejection } = props;
  toast.message(
    <>
      {move === "undo" ? "Undo" : "Redo"}{" "}
      <span className="text-low font-normal">{getMarkAction(mark)}</span>{" "}
      <span className="wrap-anywhere">{subject}</span>
    </>,
    {
      // Walking back several marks updates one toast instead of stacking one
      // per keystroke.
      id: "review-mark-history",
      icon:
        move === "undo" ? (
          <Undo2Icon className="text-low size-4" />
        ) : (
          <Redo2Icon className="text-low size-4" />
        ),
      description: takesBackRejection
        ? "Any note you left explaining the rejection stays on the snapshot."
        : undefined,
    },
  );
}
