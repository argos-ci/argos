import { createContext, memo, use, useMemo, useState } from "react";
import { invariant } from "@argos/util/invariant";

import { DocumentType, graphql } from "@/gql";
import { Dialog } from "@/ui/Dialog";
import { Modal, ModalProps } from "@/ui/Modal";

import { BuildReviewForm } from "./BuildReviewForm";

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
      {/* Same review surface as the header popover, just hosted in a modal. */}
      <Dialog aria-label="Submit your review">
        <BuildReviewForm
          build={project.build}
          onSubmitted={() => onOpenChange(false)}
          size="large"
        />
      </Dialog>
    </Modal>
  );
});

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
