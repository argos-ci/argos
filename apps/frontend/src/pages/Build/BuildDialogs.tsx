import { useState } from "react";

import { DocumentType, graphql } from "@/gql";
import { Modal } from "@/ui/Modal";

import {
  BuildOrphanDialog,
  useBuildOrphanDialogState,
} from "./BuildOrphanDialog";
import { useBuildParams } from "./BuildParams";
import {
  BuildPreviousReviewDialog,
  useBuildPreviousReviewDialogState,
} from "./BuildPreviousReviewDialog";

const _BuildFragment = graphql(`
  fragment BuildDialogs_Build on Build {
    ...BuildPreviousReviewDialog_Build
    ...BuildOrphanDialog_Build
  }
`);

export function BuildDialogs(props: {
  build: DocumentType<typeof _BuildFragment>;
}) {
  const { build } = props;
  const params = useBuildParams();

  const previousReviewDialogState = useBuildPreviousReviewDialogState({
    build,
  });
  const [initialPreviousReviewDialogState] = useState(
    previousReviewDialogState,
  );
  const orphanDialogState = useBuildOrphanDialogState({ build });
  const [initialOrphanDialogState] = useState(orphanDialogState);

  if (initialPreviousReviewDialogState) {
    return (
      <Modal {...initialPreviousReviewDialogState}>
        <BuildPreviousReviewDialog build={build} />
      </Modal>
    );
  }

  if (initialOrphanDialogState && params) {
    return (
      <Modal {...initialOrphanDialogState}>
        <BuildOrphanDialog params={params} build={build} />
      </Modal>
    );
  }

  return null;
}
