import { createContext, memo, use, useMemo, useState } from "react";
import { invariant } from "@argos/util/invariant";

import { DocumentType, FragmentType, graphql, useFragment } from "@/gql";
import { ValidationStatus } from "@/gql/graphql";
import { Button } from "@/ui/Button";
import {
  Dialog,
  DialogBody,
  DialogDismiss,
  DialogFooter,
  DialogText,
  DialogTitle,
} from "@/ui/Dialog";
import { getGraphQLErrorMessage } from "@/ui/Form";
import { FormError } from "@/ui/FormError";
import { Modal, ModalProps } from "@/ui/Modal";

import { useSetValidationStatusMutation } from "./BuildReviewAction";
import { BuildReviewButton } from "./BuildReviewButton";
import { useBuildReviewSummary } from "./BuildReviewState";

const ProjectFragment = graphql(`
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
  project: DocumentType<typeof ProjectFragment>;
}) {
  const summary = useBuildReviewSummary();
  const [setValidationStatus, { loading, error }] =
    useSetValidationStatusMutation();
  const hasBuild = Boolean(props.project.build);
  const disabled = !hasBuild || loading;
  return (
    <Modal
      isOpen={props.isOpen}
      onOpenChange={props.onOpenChange}
      isDismissable
    >
      {(() => {
        if (summary.pending.length === 0 && summary.rejected.length === 0) {
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
                {error && (
                  <FormError>{getGraphQLErrorMessage(error)}</FormError>
                )}
                <DialogDismiss>Cancel</DialogDismiss>
                <Button
                  isDisabled={disabled}
                  variant="primary"
                  autoFocus
                  onPress={() => {
                    if (!props.project.build) {
                      return;
                    }
                    setValidationStatus({
                      variables: {
                        buildId: props.project.build.id,
                        validationStatus: ValidationStatus.Accepted,
                      },
                    }).catch(() => {});
                    props.onOpenChange(false);
                  }}
                >
                  Approve changes
                </Button>
              </DialogFooter>
            </Dialog>
          );
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
              {error && <FormError>{getGraphQLErrorMessage(error)}</FormError>}
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

export function BuildReviewDialogProvider(props: {
  children: React.ReactNode;
  project: FragmentType<typeof ProjectFragment> | null;
}) {
  const project = useFragment(ProjectFragment, props.project);
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
