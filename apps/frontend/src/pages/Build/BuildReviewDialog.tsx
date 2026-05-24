import { createContext, memo, use, useMemo, useState } from "react";
import { invariant } from "@argos/util/invariant";

import { DocumentType, graphql } from "@/gql";
import { BuildReviewEvent } from "@/gql/graphql";
import {
  Dialog,
  DialogBody,
  DialogDismiss,
  DialogText,
  DialogTitle,
} from "@/ui/Dialog";
import { Modal, ModalProps } from "@/ui/Modal";

import { BuildReviewForm } from "./BuildReviewForm";
import { useBuildReviewSummary } from "./BuildReviewState";
import { EvaluationStatus } from "./EvaluationStatus";

const _ProjectFragment = graphql(`
  fragment BuildReviewDialog_Project on Project {
    build(number: $buildNumber) {
      id
      ...BuildReviewForm_Build
    }
  }
`);

type BuildReviewDialogContextValue = {
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
};

const BuildReviewDialogContext =
  createContext<null | BuildReviewDialogContextValue>(null);

export function useReviewDialog() {
  const context = use(BuildReviewDialogContext);
  invariant(
    context,
    "useReviewDialog must be called in BuildReviewDialogProvider",
  );
  const { setIsOpen } = context;
  return useMemo(
    () => ({
      show: () => setIsOpen(true),
    }),
    [setIsOpen],
  );
}

const BuildReviewModal = memo(function BuildReviewModal(props: {
  isOpen: NonNullable<ModalProps["isOpen"]>;
  onOpenChange: NonNullable<ModalProps["onOpenChange"]>;
  project: DocumentType<typeof _ProjectFragment>;
}) {
  const { project, isOpen, onOpenChange } = props;
  if (!project.build) {
    return null;
  }
  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} isDismissable>
      <BuildReviewDialog
        build={project.build}
        onClose={() => onOpenChange(false)}
      />
    </Modal>
  );
});

function BuildReviewDialog(props: {
  build: NonNullable<DocumentType<typeof _ProjectFragment>["build"]>;
  onClose: () => void;
}) {
  const { build, onClose } = props;
  const summary = useBuildReviewSummary();
  invariant(summary, "BuildReviewDialog requires a summary");
  const hasRejected = summary[EvaluationStatus.Rejected].length > 0;
  const pendingCount = summary[EvaluationStatus.Pending].length;
  const rejectedCount = summary[EvaluationStatus.Rejected].length;

  return (
    <Dialog size="medium">
      <DialogBody>
        <DialogTitle>Submit your review</DialogTitle>
        <DialogText>
          {hasRejected ? (
            <>
              During your review,{" "}
              <strong>
                {rejectedCount === 1
                  ? "1 change has been marked as rejected"
                  : `${rejectedCount} changes have been marked as rejected`}
              </strong>
              .
            </>
          ) : pendingCount > 0 ? (
            <>
              <strong>
                {pendingCount === 1
                  ? "1 change is still pending review"
                  : `${pendingCount} changes are still pending review`}
              </strong>
              .
            </>
          ) : (
            <>
              <strong>All changes have been marked as accepted.</strong>
            </>
          )}
        </DialogText>
      </DialogBody>
      <BuildReviewForm
        build={build}
        defaultEvent={
          hasRejected ? BuildReviewEvent.Reject : BuildReviewEvent.Approve
        }
        onSubmitted={() => onClose()}
        cancel={<DialogDismiss>Cancel</DialogDismiss>}
      />
    </Dialog>
  );
}

export function BuildReviewDialogProvider(props: {
  children: React.ReactNode;
  project: DocumentType<typeof _ProjectFragment> | null;
}) {
  const { project, children } = props;
  const [isOpen, setIsOpen] = useState(false);
  const value = useMemo(() => ({ setIsOpen }), []);
  return (
    <>
      {project ? (
        <BuildReviewModal
          isOpen={isOpen}
          onOpenChange={setIsOpen}
          project={project}
        />
      ) : null}
      <BuildReviewDialogContext value={value}>
        {children}
      </BuildReviewDialogContext>
    </>
  );
}
