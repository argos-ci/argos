import { invariant } from "@argos/util/invariant";

import { DocumentType, graphql } from "@/gql";
import { Button } from "@/ui/Button";
import {
  Dialog,
  DialogBody,
  DialogDismiss,
  DialogFooter,
  DialogText,
  DialogTitle,
  useOverlayTriggerState,
} from "@/ui/Dialog";
import { toast } from "@/ui/Toaster";

import { useBuildDiffState } from "./BuildDiffState";
import {
  useAcknowledgeMarkedDiff,
  useBuildReviewAPI,
  useBuildReviewState,
} from "./BuildReviewState";
import { EvaluationStatus } from "./EvaluationStatus";

const _BuildFragment = graphql(`
  fragment BuildPreviousReviewDialog_Build on Build {
    branchApprovedDiffs
    mergeQueue
    viewerHasSubmittedReview
  }
`);

export function useBuildPreviousReviewDialogState(props: {
  build: DocumentType<typeof _BuildFragment>;
}) {
  const { build } = props;

  // We only care about the first mount, so using `useGetReviewDiffStatuses` is fine here
  // no need to be reactive.
  const api = useBuildReviewAPI();

  if (
    build.mergeQueue ||
    // If the viewer already has a submitted review (e.g. their approvals were
    // reapplied automatically server-side), there's nothing left to reapply.
    build.viewerHasSubmittedReview ||
    build.branchApprovedDiffs.length === 0 ||
    !api ||
    Object.keys(api.getDiffStatuses()).length !== 0
  ) {
    return null;
  }

  return { defaultOpen: true };
}

export function BuildPreviousReviewDialog(props: {
  build: DocumentType<typeof _BuildFragment>;
}) {
  const { build } = props;

  return (
    <Dialog size="medium">
      <DialogBody>
        <DialogTitle>Previous approvals detected</DialogTitle>
        <DialogText>
          We found approved diffs from a previous build on the same branch. Do
          you want to reapply those approvals?
        </DialogText>
      </DialogBody>
      <DialogFooter>
        <DialogDismiss>Cancel</DialogDismiss>
        <ReapplyPreviousApprovalsButton
          branchApprovedDiffs={build.branchApprovedDiffs}
        />
      </DialogFooter>
    </Dialog>
  );
}

function ReapplyPreviousApprovalsButton(props: {
  branchApprovedDiffs: string[];
}) {
  const { branchApprovedDiffs } = props;
  const api = useBuildReviewAPI();
  const reviewState = useBuildReviewState();
  // After reapplying, land on the first diff that still needs a review,
  // starting from the top of the list. The next diff has to be resolved after
  // the approvals are applied — resolving it now would still see the reapplied
  // diffs as pending and navigate to one of them.
  const [checkIsPending, acknowledge] = useAcknowledgeMarkedDiff({
    fromIndex: -1,
    resolveNextDiffOnAck: true,
  });
  invariant(
    reviewState,
    "Review state should exist if this dialog is displayed",
  );
  const { stats, isSubsetBuild } = useBuildDiffState();
  const { close } = useOverlayTriggerState();
  return (
    <Button
      onPress={() => {
        if (checkIsPending()) {
          return;
        }
        invariant(api);
        api.setDiffStatuses((prev) => ({
          ...prev,
          ...branchApprovedDiffs.reduce<Record<string, EvaluationStatus>>(
            (acc, diffId) => {
              acc[diffId] = EvaluationStatus.Accepted;
              return acc;
            },
            {},
          ),
        }));
        const count = branchApprovedDiffs.length;
        const total = stats
          ? stats.added + stats.changed + (isSubsetBuild ? 0 : stats.removed)
          : null;
        const remaining = total !== null ? Math.max(0, total - count) : null;
        toast.success(
          count === 1
            ? "1 previous approval reapplied"
            : `${count} previous approvals reapplied`,
          {
            description:
              remaining === null
                ? undefined
                : remaining === 0
                  ? "All changes are reviewed — you're ready to submit your review."
                  : `${remaining === 1 ? "1 change" : `${remaining} changes`} left to review — taking you to the first one.`,
          },
        );
        acknowledge();
        close();
      }}
    >
      Reapply previous approvals
    </Button>
  );
}
