import { useEffect, useId, useRef, useState } from "react";
import { useMutation } from "@apollo/client/react";
import { clsx } from "clsx";
import { ArrowUpIcon } from "lucide-react";
import moment from "moment";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "react-aria-components";
import { toast } from "sonner";
import { useClipboard } from "use-clipboard-copy";

import { AccountAvatar } from "@/containers/AccountAvatar";
import { DocumentType, graphql } from "@/gql";
import { CommentPermission } from "@/gql/graphql";
import { Editor, type EditorValue } from "@/ui/Editor/Editor";
import { MOD } from "@/ui/Editor/EditorToolbar.shortcuts";
import { ReadOnlyEditor } from "@/ui/Editor/ReadOnlyEditor";
import { StandaloneEditor } from "@/ui/Editor/StandaloneEditor";
import { hasEditorContent } from "@/ui/Editor/util";
import { HotkeyTooltip } from "@/ui/HotkeyTooltip";
import { IconButton } from "@/ui/IconButton";
import { Modal } from "@/ui/Modal";
import { Time } from "@/ui/Time";
import { Tooltip } from "@/ui/Tooltip";
import { getErrorMessage } from "@/util/error";

import { CommentActionsMenu } from "./CommentActionsMenu";
import {
  CommentAddReactionButton,
  CommentReactionList,
} from "./CommentReactions";
import { DeleteCommentDialog } from "./DeleteCommentDialog";
import { useMentionableUsers } from "./MentionableUsersContext";

// Shared id so copying a comment link reuses a single toast instead of stacking.
const COPY_TOAST_ID = "comment-link-copied";

// Detailed date format used in the date tooltip, e.g. "Thu May 21, 2026, 15:47:43".
const DETAILED_DATE_FORMAT = "ddd MMM D, YYYY, HH:mm:ss";

const _CommentFragment = graphql(`
  fragment CommentCard_Comment on Comment {
    id
    date
    editedAt
    content
    threadId
    threadSubscribed
    permissions
    user {
      id
      name
      slug
      avatar {
        ...AccountAvatarFragment
      }
    }
    ...CommentReactions_Comment
  }
`);

type Comment = DocumentType<typeof _CommentFragment>;

const UpdateCommentMutation = graphql(`
  mutation CommentCard_updateComment($input: UpdateCommentInput!) {
    updateComment(input: $input) {
      id
      ...CommentCard_Comment
    }
  }
`);

const AddReplyMutation = graphql(`
  mutation CommentCard_addBuildComment($input: AddBuildCommentInput!) {
    addBuildComment(input: $input) {
      id
      comments {
        ...CommentCard_Comment
      }
    }
  }
`);

const SubscribeToCommentThreadMutation = graphql(`
  mutation CommentCard_subscribeToCommentThread(
    $input: SubscribeToCommentThreadInput!
  ) {
    subscribeToCommentThread(input: $input) {
      id
      threadSubscribed
    }
  }
`);

const UnsubscribeFromCommentThreadMutation = graphql(`
  mutation CommentCard_unsubscribeFromCommentThread(
    $input: UnsubscribeFromCommentThreadInput!
  ) {
    unsubscribeFromCommentThread(input: $input) {
      id
      threadSubscribed
    }
  }
`);

export function CommentCard(props: {
  buildId: string;
  comment: Comment;
  replies?: Comment[];
  highlightedCommentId: string | null;
  canReply: boolean;
}) {
  const {
    buildId,
    comment,
    replies = [],
    highlightedCommentId,
    canReply,
  } = props;
  const [addReply] = useMutation(AddReplyMutation);
  const [subscribeToCommentThread] = useMutation(
    SubscribeToCommentThreadMutation,
    {
      variables: { input: { commentId: comment.id } },
      optimisticResponse: {
        subscribeToCommentThread: {
          __typename: "Comment",
          id: comment.id,
          threadSubscribed: true,
        },
      },
    },
  );
  const [unsubscribeFromCommentThread] = useMutation(
    UnsubscribeFromCommentThreadMutation,
    {
      variables: { input: { commentId: comment.id } },
      optimisticResponse: {
        unsubscribeFromCommentThread: {
          __typename: "Comment",
          id: comment.id,
          threadSubscribed: false,
        },
      },
    },
  );

  const handleReplySubmit = async (body: EditorValue) => {
    try {
      await addReply({
        variables: { input: { buildId, threadId: comment.id, body } },
      });
    } catch (error) {
      toast.error(getErrorMessage(error));
      // Rethrow so the editor keeps the content and the user can retry.
      throw error;
    }
  };

  const subscribeThread = () => {
    subscribeToCommentThread()
      .then(() => {
        toast.success("You will receive notifications for this thread.");
      })
      .catch((error) => {
        toast.error(getErrorMessage(error));
      });
  };

  const unsubscribeThread = () => {
    unsubscribeFromCommentThread()
      .then(() => {
        toast.success(
          "You will no longer receive notifications for this thread.",
        );
      })
      .catch((error) => {
        toast.error(getErrorMessage(error));
      });
  };

  return (
    <div className="border-thin bg-app -mx-2.5 rounded-md">
      <CommentMessage
        comment={comment}
        highlighted={comment.id === highlightedCommentId}
        threadSubscribed={comment.threadSubscribed}
        onSubscribeThread={subscribeThread}
        onUnsubscribeThread={unsubscribeThread}
      />
      <AnimatePresence initial={false}>
        {replies.map((reply) => (
          <motion.div
            key={reply.id}
            style={{ overflowY: "clip" }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              duration: 0.25,
              ease: [0.4, 0, 0.2, 1],
              opacity: { duration: 0.15 },
            }}
          >
            <CommentMessage
              comment={reply}
              highlighted={reply.id === highlightedCommentId}
              isReply
              separated
              threadSubscribed={comment.threadSubscribed}
              onSubscribeThread={subscribeThread}
              onUnsubscribeThread={unsubscribeThread}
            />
          </motion.div>
        ))}
      </AnimatePresence>
      {canReply ? <ReplyComposer onSubmit={handleReplySubmit} /> : null}
    </div>
  );
}

function CommentMessage(props: {
  comment: Comment;
  highlighted: boolean;
  threadSubscribed: boolean;
  onSubscribeThread: () => void;
  onUnsubscribeThread: () => void;
  separated?: boolean;
  isReply?: boolean;
}) {
  const {
    comment,
    highlighted,
    threadSubscribed,
    onSubscribeThread,
    onUnsubscribeThread,
    separated = false,
    isReply = false,
  } = props;
  const ref = useRef<HTMLDivElement>(null);
  const clipboard = useClipboard();
  const mentions = useMentionableUsers();
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [updateComment] = useMutation(UpdateCommentMutation);

  useEffect(() => {
    if (highlighted && ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlighted]);

  const copyLink = () => {
    const url = new URL(window.location.href);
    url.hash = comment.id;
    clipboard.copy(url.toString());
    toast.success("Link copied", {
      id: COPY_TOAST_ID,
      description: "The link to this comment was copied to your clipboard.",
    });
  };

  const handleEditSubmit = async (body: EditorValue) => {
    try {
      await updateComment({
        variables: { input: { id: comment.id, body } },
      });
      setIsEditing(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
      // Rethrow so the editor keeps the content and the user can retry.
      throw error;
    }
  };

  const canEdit = comment.permissions.includes(CommentPermission.Edit);
  const canDelete = comment.permissions.includes(CommentPermission.Delete);
  const isEdited = Boolean(comment.editedAt);
  const contentClassName = isReply ? "pl-8 pr-1" : "px-1";

  return (
    <>
      <div
        ref={ref}
        id={comment.id}
        className={clsx(
          "group/comment ring-primary transition",
          separated && "border-t-thin",
          highlighted ? "ring-2" : "ring-0",
        )}
      >
        <div className="relative flex items-center gap-2 px-2 py-1.5 pr-1.5">
          {comment.user ? (
            <AccountAvatar
              avatar={comment.user.avatar}
              className="size-5 shrink-0 border"
            />
          ) : null}
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="text-default max-w-full min-w-0 text-xs font-medium break-words">
                {comment.user?.name || comment.user?.slug || "Unknown user"}
              </span>
              <Tooltip
                content={
                  <div className="flex flex-col">
                    <span>
                      Created:{" "}
                      {moment(comment.date).format(DETAILED_DATE_FORMAT)}
                    </span>
                    {comment.editedAt ? (
                      <span>
                        Edited:{" "}
                        {moment(comment.editedAt).format(DETAILED_DATE_FORMAT)}
                      </span>
                    ) : null}
                  </div>
                }
              >
                <Button
                  onPress={copyLink}
                  aria-label="Copy link to comment"
                  className="text-low hover:text-default shrink-0 text-left text-xs transition"
                >
                  <Time date={comment.date} tooltip="none" />
                  {isEdited ? " (edited)" : null}
                </Button>
              </Tooltip>
            </div>
          </div>
          <div className="bg-app pointer-events-none absolute top-1 right-1 flex items-center rounded-md pl-1 opacity-0 transition group-focus-within/comment:pointer-events-auto group-focus-within/comment:opacity-100 group-hover/comment:pointer-events-auto group-hover/comment:opacity-100 has-[button[aria-expanded=true]]:pointer-events-auto has-[button[aria-expanded=true]]:opacity-100">
            <CommentAddReactionButton comment={comment} />
            <CommentActionsMenu
              onCopyLink={copyLink}
              threadSubscribed={threadSubscribed}
              onSubscribeThread={onSubscribeThread}
              onUnsubscribeThread={onUnsubscribeThread}
              onEdit={canEdit ? () => setIsEditing(true) : undefined}
              onDelete={
                canDelete ? () => setIsDeleteDialogOpen(true) : undefined
              }
            />
          </div>
        </div>
        <div className="text-default px-1 pb-2 text-sm">
          {isEditing ? (
            <StandaloneEditor
              variant="plain"
              defaultValue={comment.content}
              mentions={mentions}
              onSubmit={handleEditSubmit}
              onCancel={() => setIsEditing(false)}
              submitLabel="Save"
              emptyMessage={{
                title: "Comment required",
                description: "Please add a comment before saving.",
              }}
              autoFocus
              aria-label="Edit comment"
              contentClassName={contentClassName}
            />
          ) : (
            <ReadOnlyEditor
              content={comment.content}
              className={contentClassName}
              mentions={mentions}
            />
          )}
        </div>
        <CommentReactionList comment={comment} />
      </div>
      <Modal isOpen={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DeleteCommentDialog commentId={comment.id} />
      </Modal>
    </>
  );
}

function ReplyComposer(props: {
  onSubmit: (body: EditorValue) => Promise<void>;
}) {
  const { onSubmit } = props;
  const mentions = useMentionableUsers();
  const [value, setValue] = useState<EditorValue>(null);
  const [editorKey, setEditorKey] = useState(0);
  const [isPending, setIsPending] = useState(false);
  const emptyToastId = useId();
  const isEmpty = !hasEditorContent(value);

  const performSubmit = async () => {
    setIsPending(true);
    try {
      await onSubmit(value);
      setValue(null);
      setEditorKey((key) => key + 1);
    } catch {
      // Keep the content so the user can retry.
    } finally {
      setIsPending(false);
    }
  };

  const submit = () => {
    if (isPending) {
      return;
    }
    if (isEmpty) {
      toast.warning("Reply required", {
        id: emptyToastId,
        description: "Please add a reply before submitting.",
      });
      return;
    }
    void performSubmit();
  };

  return (
    <div className="border-t-thin px-2 py-1">
      <div className="flex items-start gap-1.5">
        <Editor
          key={editorKey}
          onChange={setValue}
          onSubmit={submit}
          mentions={mentions}
          placeholder="Leave a reply…"
          disabled={isPending}
          aria-label="Add a reply"
          variant="plain"
          className="min-w-0 flex-1 text-sm"
          contentClassName="min-h-6 py-0.5"
        />
        <HotkeyTooltip
          description="Submit the reply"
          keys={[MOD, "Enter"]}
          placement="top"
        >
          <IconButton
            variant="contained"
            size="small"
            rounded
            aria-label="Submit the reply"
            aria-disabled={isEmpty}
            isDisabled={isPending}
            onPress={submit}
            className="mt-0.5 shrink-0"
          >
            <ArrowUpIcon />
          </IconButton>
        </HotkeyTooltip>
      </div>
    </div>
  );
}
