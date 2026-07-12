import {
  createContext,
  use,
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { useApolloClient } from "@apollo/client/react";
import { invariant } from "@argos/util/invariant";

import { DocumentType, graphql } from "@/gql";
import { useProjectParams } from "@/pages/Project/ProjectParams";
import { Button } from "@/ui/Button";
import { Checkbox } from "@/ui/Checkbox";
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
import { Modal, ModalActionContext } from "@/ui/Modal";
import { toast } from "@/ui/Toaster";
import { getMentionUser } from "@/ui/UserCard";
import { getErrorMessage } from "@/util/error";
import * as sessionStorage from "@/util/session-storage";

import { useBuildDiffState } from "./BuildDiffState";
import { useOpenReviewSidebar } from "./RightSidebarState";
import { ScreenshotDiffThumbnail } from "./sidebar/ScreenshotDiffThumbnail";

// Key used to remember, for the current session, that the reviewer opted out of
// the reject-note prompt (mirrors the "ignore change" dialog's opt-out).
const dontAskAgainKey = "rejectCommentDontShowAgain";

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
 * that snapshot and the reviewer hasn't opted out for the session, returning
 * whether it did so — callers use this to skip the usual auto-advance while the
 * dialog is open. When it opens, `onProceed` is invoked once the reviewer
 * submits or skips the note, so the caller can advance to the next diff.
 * Null when no provider is mounted.
 */
type PromptRejectComment = (
  screenshotDiffId: string,
  onProceed: () => void,
) => boolean;

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
  const [state, setState] = useState<{
    diffId: string;
    onProceed: () => void;
  } | null>(null);

  const comments = build?.comments;
  const promptRejectComment = useCallback<PromptRejectComment>(
    (screenshotDiffId, onProceed) => {
      // Respect the session-wide opt-out, just like the "ignore change" dialog.
      if (sessionStorage.getItem(dontAskAgainKey) === "true") {
        return false;
      }
      const hasPendingComment = (comments ?? []).some(
        (comment) =>
          comment.pending && comment.screenshotDiff?.id === screenshotDiffId,
      );
      if (hasPendingComment) {
        return false;
      }
      setState({ diffId: screenshotDiffId, onProceed });
      return true;
    },
    [comments],
  );

  return (
    <RejectCommentDialogContext value={build ? promptRejectComment : null}>
      {children}
      {build ? (
        <Modal
          isOpen={state != null}
          onOpenChange={(open) => {
            if (!open) {
              setState(null);
            }
          }}
          isDismissable
        >
          {state ? (
            <RejectCommentDialog
              build={build}
              screenshotDiffId={state.diffId}
              onProceed={state.onProceed}
              onClose={() => setState(null)}
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
  onProceed: () => void;
  onClose: () => void;
}) {
  const { build, screenshotDiffId, onProceed, onClose } = props;
  const projectParams = useProjectParams();
  invariant(projectParams);
  const { diffs, allDiffs } = useBuildDiffState();
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
  const emptyToastId = useId();
  const isEmpty = !hasEditorContent(value);
  const client = useApolloClient();
  // Drive the modal's pending state (rather than a local one) so the footer
  // buttons disable and the modal can't be dismissed while submitting — the
  // same mechanism a dialog `Form` uses. We call the Apollo client directly
  // instead of `useMutation` to avoid re-rendering on the mutation's own state.
  const actionContext = use(ModalActionContext);
  const isPending = actionContext?.isPending ?? false;
  // Synchronous guard against a double submit, since the pending state above
  // only updates on the next render.
  const submittingRef = useRef(false);

  const submit = () => {
    if (submittingRef.current) {
      return;
    }
    if (isEmpty) {
      toast.warning("Comment required", {
        id: emptyToastId,
        description: "Please add a comment before submitting.",
      });
      return;
    }
    submittingRef.current = true;
    actionContext?.setIsPending(true);
    client
      .mutate({
        mutation: AddBuildCommentMutation,
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
        // next snapshot to review so the reviewer can keep going.
        onClose();
        openReviewSidebar();
        onProceed();
      })
      .catch((error) => {
        toast.error(getErrorMessage(error));
        // Keep the content so the user can retry.
        submittingRef.current = false;
      })
      .finally(() => {
        // Reset even on success: the parent Modal (and its pending state) is
        // reused across opens, so leaving it pending would lock the next one.
        actionContext?.setIsPending(false);
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
        <div className="flex flex-1">
          <Checkbox
            onChange={(value) => {
              if (value) {
                sessionStorage.setItem(dontAskAgainKey, "true");
              } else {
                sessionStorage.removeItem(dontAskAgainKey);
              }
            }}
          >
            Don’t ask again for this session
          </Checkbox>
        </div>
        {/*
          DialogDismiss disables itself while the modal action is pending and
          closes the dialog after `onPress`. Skipping still advances to the next
          diff to review, matching a submitted note.
        */}
        <DialogDismiss onPress={onProceed}>Skip</DialogDismiss>
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
