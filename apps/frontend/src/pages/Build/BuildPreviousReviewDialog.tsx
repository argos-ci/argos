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

import {
  EvaluationStatus,
  useAcknowledgeMarkedDiff,
  useBuildReviewAPI,
  useBuildReviewState,
} from "./BuildReviewState";

const _BuildFragment = graphql(`
  fragment BuildPreviousReviewDialog_Build on Build {
    branchApprovedDiffs
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
  const [checkIsPending, acknowledge] = useAcknowledgeMarkedDiff({
    fromIndex: 0,
  });
  invariant(
    reviewState,
    "Review state should exist if this dialog is displayed",
  );
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
        acknowledge();
        close();
      }}
    >
      Reapply previous approvals
    </Button>
  );
}
