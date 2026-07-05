import {
  createContext,
  use,
  useCallback,
  useId,
  useMemo,
  useState,
} from "react";
import { useMutation } from "@apollo/client/react";
import { invariant } from "@argos/util/invariant";
import { toast } from "sonner";

import { DocumentType, graphql } from "@/gql";
import { useProjectParams } from "@/pages/Project/ProjectParams";
import { Button } from "@/ui/Button";
import {
  Dialog,
  DialogBody,
  DialogDismiss,
  DialogFooter,
  DialogText,
  DialogTitle,
} from "@/ui/Dialog";
import { Editor, type EditorValue } from "@/ui/Editor/Editor";
import { hasEditorContent } from "@/ui/Editor/util";
import { Modal } from "@/ui/Modal";
import { getMentionUser } from "@/ui/UserCard";
import { getErrorMessage } from "@/util/error";

import { useBuildDiffState, useGoToNextDiff } from "./BuildDiffState";
import { useOpenReviewSidebar } from "./RightSidebarState";
import { ScreenshotDiffThumbnail } from "./sidebar/ScreenshotDiffThumbnail";

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
  const { diffs, allDiffs } = useBuildDiffState();
  const goToNextDiff = useGoToNextDiff();
  const openReviewSidebar = useOpenReviewSidebar();
  // The snapshot the note will be attached to, shown above the field so the
  // reviewer sees what they're commenting on (the reject flow always acts on a
  // loaded diff, so this is normally found).
  const diff =
    diffs.find((candidate) => candidate.id === screenshotDiffId) ??
    allDiffs.find((candidate) => candidate.id === screenshotDiffId) ??
    null;
  const mentions = useMemo(
    () => build.members.map(getMentionUser),
    [build.members],
  );
  const [value, setValue] = useState<EditorValue>(null);
  const [isPending, setIsPending] = useState(false);
  const emptyToastId = useId();
  const isEmpty = !hasEditorContent(value);
  const [addBuildComment] = useMutation(AddBuildCommentMutation);

  const submit = () => {
    if (isPending) {
      return;
    }
    if (isEmpty) {
      toast.warning("Comment required", {
        id: emptyToastId,
        description: "Please add a comment before submitting.",
      });
      return;
    }
    setIsPending(true);
    addBuildComment({
      variables: {
        input: {
          buildId: build.id,
          screenshotDiffId,
          body: value,
          addToReview: true,
        },
        accountSlug: projectParams.accountSlug,
        projectName: projectParams.projectName,
      },
    })
      .then(() => {
        // Close, reveal the new comment in the review panel, and move on to the
        // next snapshot so the reviewer can keep going.
        onClose();
        openReviewSidebar();
        goToNextDiff();
      })
      .catch((error) => {
        toast.error(getErrorMessage(error));
        // Keep the content so the user can retry.
        setIsPending(false);
      });
  };

  return (
    <Dialog size="medium">
      <DialogBody>
        <DialogTitle>Add a note about this rejection</DialogTitle>
        <DialogText>
          Let your team know why you're rejecting this snapshot. Your comment is
          added to your review and becomes visible once you submit it.
        </DialogText>
        {diff ? (
          <div className="border-thin bg-subtle mb-3 flex items-center gap-2.5 rounded-md p-2">
            <ScreenshotDiffThumbnail
              screenshotDiff={diff}
              className="size-8"
              iconClassName="size-5"
              fit="cover"
            />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">
              {diff.name}
            </span>
          </div>
        ) : null}
        <Editor
          onChange={setValue}
          onSubmit={submit}
          mentions={mentions}
          placeholder="Leave a comment…"
          disabled={isPending}
          autoFocus
          aria-label="Rejection comment"
        />
      </DialogBody>
      <DialogFooter>
        <DialogDismiss isDisabled={isPending}>Skip</DialogDismiss>
        <Button
          variant="primary"
          isPending={isPending}
          aria-disabled={isEmpty}
          onPress={submit}
        >
          Add to review
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
