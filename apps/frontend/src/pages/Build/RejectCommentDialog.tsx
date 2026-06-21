import { createContext, use, useCallback, useMemo, useState } from "react";
import { useMutation } from "@apollo/client/react";
import { invariant } from "@argos/util/invariant";
import { toast } from "sonner";

import { DocumentType, graphql } from "@/gql";
import { useProjectParams } from "@/pages/Project/ProjectParams";
import {
  Dialog,
  DialogBody,
  DialogDismiss,
  DialogFooter,
  DialogText,
  DialogTitle,
} from "@/ui/Dialog";
import { type EditorValue } from "@/ui/Editor/Editor";
import { StandaloneEditor } from "@/ui/Editor/StandaloneEditor";
import { Modal } from "@/ui/Modal";
import { getMentionUser } from "@/ui/UserCard";
import { getErrorMessage } from "@/util/error";

const _BuildFragment = graphql(`
  fragment RejectCommentDialog_Build on Build {
    id
    members {
      ...UserCard_user
    }
    comments {
      id
      pending
      screenshotDiff {
        id
      }
    }
  }
`);

type Build = DocumentType<typeof _BuildFragment>;

const AddBuildCommentMutation = graphql(`
  mutation RejectCommentDialog_addBuildComment(
    $input: AddBuildCommentInput!
    $accountSlug: String!
    $projectName: String!
  ) {
    addBuildComment(input: $input) {
      id
      comments {
        ...CommentCard_Comment
      }
    }
  }
`);

/**
 * Returns a function to invite the user to comment on why they're rejecting a
 * snapshot. It opens the dialog only when no pending comment already exists on
 * that snapshot, returning whether it did so — callers use this to skip the
 * usual auto-advance while the dialog is open. Null when no provider is mounted.
 */
type PromptRejectComment = (screenshotDiffId: string) => boolean;

const RejectCommentDialogContext = createContext<PromptRejectComment | null>(
  null,
);

export function useRejectCommentInvite(): PromptRejectComment | null {
  return use(RejectCommentDialogContext);
}

export function RejectCommentDialogProvider(props: {
  build: Build | null;
  children: React.ReactNode;
}) {
  const { build, children } = props;
  const [diffId, setDiffId] = useState<string | null>(null);

  const comments = build?.comments;
  const promptRejectComment = useCallback<PromptRejectComment>(
    (screenshotDiffId) => {
      const hasPendingComment = (comments ?? []).some(
        (comment) =>
          comment.pending && comment.screenshotDiff?.id === screenshotDiffId,
      );
      if (hasPendingComment) {
        return false;
      }
      setDiffId(screenshotDiffId);
      return true;
    },
    [comments],
  );

  return (
    <RejectCommentDialogContext value={build ? promptRejectComment : null}>
      {children}
      {build ? (
        <Modal
          isOpen={diffId != null}
          onOpenChange={(open) => {
            if (!open) {
              setDiffId(null);
            }
          }}
          isDismissable
        >
          {diffId ? (
            <RejectCommentDialog
              build={build}
              screenshotDiffId={diffId}
              onClose={() => setDiffId(null)}
            />
          ) : (
            <span />
          )}
        </Modal>
      ) : null}
    </RejectCommentDialogContext>
  );
}

function RejectCommentDialog(props: {
  build: Build;
  screenshotDiffId: string;
  onClose: () => void;
}) {
  const { build, screenshotDiffId, onClose } = props;
  const projectParams = useProjectParams();
  invariant(projectParams);
  const mentions = useMemo(
    () => build.members.map(getMentionUser),
    [build.members],
  );
  const [addBuildComment] = useMutation(AddBuildCommentMutation);
  const handleSubmit = async (body: EditorValue) => {
    try {
      await addBuildComment({
        variables: {
          input: {
            buildId: build.id,
            screenshotDiffId,
            body,
            addToReview: true,
          },
          accountSlug: projectParams.accountSlug,
          projectName: projectParams.projectName,
        },
      });
      onClose();
    } catch (error) {
      toast.error(getErrorMessage(error));
      // Rethrow so the editor keeps the content and the user can retry.
      throw error;
    }
  };
  return (
    <Dialog size="medium">
      <DialogBody>
        <DialogTitle>Add a note about this rejection</DialogTitle>
        <DialogText>
          Let your team know why you're rejecting this snapshot. Your comment is
          added to your review and becomes visible once you submit it.
        </DialogText>
        <StandaloneEditor
          onSubmit={handleSubmit}
          mentions={mentions}
          placeholder="Leave a comment…"
          submitLabel="Add to review"
          emptyMessage={{
            title: "Comment required",
            description: "Please add a comment before submitting.",
          }}
          autoFocus
          aria-label="Rejection comment"
        />
      </DialogBody>
      <DialogFooter>
        <DialogDismiss>Skip</DialogDismiss>
      </DialogFooter>
    </Dialog>
  );
}
