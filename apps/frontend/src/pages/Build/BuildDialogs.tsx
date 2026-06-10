import { useState } from "react";

import { DocumentType, graphql } from "@/gql";
import { Modal } from "@/ui/Modal";

import {
  BuildPreviousReviewDialog,
  useBuildPreviousReviewDialogState,
} from "./BuildPreviousReviewDialog";

const _BuildFragment = graphql(`
  fragment BuildDialogs_Build on Build {
    ...BuildPreviousReviewDialog_Build
  }
`);

export function BuildDialogs(props: {
  build: DocumentType<typeof _BuildFragment>;
}) {
  const { build } = props;

  const previousReviewDialogState = useBuildPreviousReviewDialogState({
    build,
  });
  const [initialPreviousReviewDialogState] = useState(
    previousReviewDialogState,
  );

  if (initialPreviousReviewDialogState) {
    return (
      <Modal {...initialPreviousReviewDialogState}>
        <BuildPreviousReviewDialog build={build} />
      </Modal>
    );
  }

  return null;
}
