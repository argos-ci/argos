import { createContext, memo, use, useMemo, useState } from "react";
import { invariant } from "@argos/util/invariant";

import { DocumentType, graphql } from "@/gql";
import { ValidationStatus } from "@/gql/graphql";
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
import { ErrorMessage } from "@/ui/ErrorMessage";
import { getGraphQLErrorMessage } from "@/ui/Form";
import { Modal, ModalProps } from "@/ui/Modal";

import { useSetValidationStatusMutation } from "./BuildReviewAction";
import { BuildReviewButton } from "./BuildReviewButton";
import { useBuildReviewSummary } from "./BuildReviewState";

const _ProjectFragment = graphql(`
  fragment BuildReviewDialog_Project on Project {
    ...BuildReviewButton_Project
    build(number: $buildNumber) {
      id
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

const BuildReviewDialog = memo(function BuildReviewDialog(props: {
  isOpen: NonNullable<ModalProps["isOpen"]>;
  onOpenChange: NonNullable<ModalProps["onOpenChange"]>;
  project: DocumentType<typeof _ProjectFragment>;
}) {
  const { project } = props;
  const summary = useBuildReviewSummary();
  if (!project.build) {
    return null;
  }
  return (
    <Modal
      isOpen={props.isOpen}
      onOpenChange={props.onOpenChange}
      isDismissable
    >
      {(() => {
        if (summary.pending.length === 0 && summary.rejected.length === 0) {
          return <FinishReviewAcceptedDialog build={project.build} />;
        }
        return (
          <Dialog size="medium">
            <DialogBody>
              <DialogTitle>Finish your review</DialogTitle>
              <DialogText>
                During your review,{" "}
                {summary.rejected.length > 1 ? (
                  <strong>
                    {summary.rejected.length} changes have been marked as
                    rejected
                  </strong>
                ) : (
                  <strong>
                    {summary.rejected.length} change has been marked as rejected
                  </strong>
                )}
                .<br />
                Approve or reject the changes to submit your review.
              </DialogText>
            </DialogBody>
            <DialogFooter>
              <DialogDismiss>Cancel</DialogDismiss>
              <BuildReviewButton
                project={props.project}
                autoFocus
                onCompleted={() => props.onOpenChange(false)}
              >
                Submit review
              </BuildReviewButton>
            </DialogFooter>
          </Dialog>
        );
      })()}
    </Modal>
  );
});

function FinishReviewAcceptedDialog(props: {
  build: NonNullable<DocumentType<typeof _ProjectFragment>["build"]>;
}) {
  const { build } = props;
  const [setValidationStatus, { loading, error }] =
    useSetValidationStatusMutation(build);
  const state = useOverlayTriggerState();
  return (
    <Dialog size="medium">
      <DialogBody>
        <DialogTitle>Finish your review</DialogTitle>
        <DialogText>
          <strong>All changes have been marked as accepted.</strong>
          <br />
          Approve the changes to submit your review.
        </DialogText>
      </DialogBody>
      <DialogFooter>
        {error && <ErrorMessage>{getGraphQLErrorMessage(error)}</ErrorMessage>}
        <DialogDismiss>Cancel</DialogDismiss>
        <Button
          isDisabled={loading}
          variant="primary"
          autoFocus
          onPress={() => {
            setValidationStatus({
              variables: {
                buildId: build.id,
                validationStatus: ValidationStatus.Accepted,
              },
            }).catch(() => {});
            state.close();
          }}
        >
          Approve changes
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

export function BuildReviewDialogProvider(props: {
  children: React.ReactNode;
  project: DocumentType<typeof _ProjectFragment> | null;
}) {
  const { project } = props;
  const [isOpen, setIsOpen] = useState(false);
  const value = useMemo(() => ({ setIsOpen }), []);
  return (
    <>
      {project && (
        <BuildReviewDialog
          isOpen={isOpen}
          onOpenChange={setIsOpen}
          project={project}
        />
      )}
      <BuildReviewDialogContext value={value}>
        {props.children}
      </BuildReviewDialogContext>
    </>
  );
}
