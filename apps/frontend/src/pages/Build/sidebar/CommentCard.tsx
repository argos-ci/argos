import { useEffect, useId, useRef, useState } from "react";
import { useApolloClient } from "@apollo/client/react";
import { invariant } from "@argos/util/invariant";
import { clsx } from "clsx";
import {
  ArrowUpIcon,
  ChevronsDownUpIcon,
  ChevronsUpDownIcon,
  MessageSquareCheckIcon,
} from "lucide-react";
import moment from "moment";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "react-aria-components";
import { toast } from "sonner";
import { useClipboard } from "use-clipboard-copy";

import { AccountAvatar } from "@/containers/AccountAvatar";
import { DocumentType, graphql } from "@/gql";
import { CommentPermission } from "@/gql/graphql";
import { useProjectParams } from "@/pages/Project/ProjectParams";
import { Editor, type EditorValue } from "@/ui/Editor/Editor";
import { MOD } from "@/ui/Editor/EditorToolbar.shortcuts";
import { ReadOnlyEditor } from "@/ui/Editor/ReadOnlyEditor";
import { StandaloneEditor } from "@/ui/Editor/StandaloneEditor";
import { useEditorDraft } from "@/ui/Editor/useEditorDraft";
import { hasEditorContent } from "@/ui/Editor/util";
import { HotkeyTooltip } from "@/ui/HotkeyTooltip";
import { IconButton } from "@/ui/IconButton";
import { Modal } from "@/ui/Modal";
import { Time } from "@/ui/Time";
import { Tooltip } from "@/ui/Tooltip";
import { getMentionUser, getUserCardData, UserHoverCard } from "@/ui/UserCard";
import { getErrorMessage } from "@/util/error";

import { CommentActionsMenu } from "./CommentActionsMenu";
import {
  CommentAddReactionButton,
  CommentReactionList,
} from "./CommentReactions";
import {
  CommentScreenshotReference,
  useGoToCommentDiff,
  type CommentAnchor,
} from "./CommentScreenshotReference";
import { DeleteCommentDialog } from "./DeleteCommentDialog";
import { useMentionableUsers } from "./MentionableUsersContext";
import { useCollapsedThread } from "./useCollapsedThread";

// Shared id so copying a comment link reuses a single toast instead of stacking.
const COPY_TOAST_ID = "comment-link-copied";

/**
 * Elements whose clicks must not trigger the card-level "go to snapshot"
 * navigation: interactive controls handle their own clicks, and zones marked
 * `data-no-card-nav` (composer, comment being edited) are input surfaces where
 * a missed click must not teleport the user away.
 */
const CARD_NAV_EXCLUDE_SELECTOR =
  'a, button, input, select, textarea, [role="button"], [contenteditable="true"], [tabindex], [data-no-card-nav]';

function isSelectionCollapsed() {
  const selection = window.getSelection();
  return !selection || selection.isCollapsed;
}

// Detailed date format used in the date tooltip, e.g. "Thu May 21, 2026, 15:47:43".
const DETAILED_DATE_FORMAT = "ddd MMM D, YYYY, HH:mm:ss";

// Shared height/opacity transition for content that animates in and out: the
// reply list, and the thread body collapsing when a thread is resolved. Kept in
// sync with the comment-removal animation so both feel the same.
const COLLAPSE_TRANSITION = {
  duration: 0.25,
  ease: [0.4, 0, 0.2, 1],
  opacity: { duration: 0.15 },
} as const;

const _CommentFragment = graphql(`
  fragment CommentCard_Comment on Comment {
    id
    date
    editedAt
    resolvedAt
    content
    threadId
    threadSubscribed
    pending
    permissions
    user {
      ...UserCard_user
    }
    mentionedUsers {
      ...UserCard_user
    }
    screenshotDiff {
      ...CommentScreenshotReference_ScreenshotDiff
    }
    anchor {
      __typename
      ... on CommentPointAnchor {
        x
        y
      }
      ... on CommentLinesAnchor {
        from
        to
      }
    }
    ...CommentReactions_Comment
  }
`);

type Comment = DocumentType<typeof _CommentFragment>;

const UpdateCommentMutation = graphql(`
  mutation CommentCard_updateComment(
    $input: UpdateCommentInput!
    $accountSlug: String!
    $projectName: String!
  ) {
    updateComment(input: $input) {
      id
      ...CommentCard_Comment
    }
  }
`);

const AddReplyMutation = graphql(`
  mutation CommentCard_addBuildComment(
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

const ResolveCommentThreadMutation = graphql(`
  mutation CommentCard_resolveCommentThread(
    $input: ResolveCommentThreadInput!
  ) {
    resolveCommentThread(input: $input) {
      id
      resolvedAt
    }
  }
`);

const UnresolveCommentThreadMutation = graphql(`
  mutation CommentCard_unresolveCommentThread(
    $input: UnresolveCommentThreadInput!
  ) {
    unresolveCommentThread(input: $input) {
      id
      resolvedAt
    }
  }
`);

export function CommentCard(props: {
  buildId: string;
  comment: Comment;
  replies?: Comment[];
  highlightedCommentId: string | null;
  canReply: boolean;
  /**
   * Hide the snapshot-reference header. Used when the thread is rendered
   * directly on the screenshot it points to, where the reference is redundant.
   */
  hideScreenshotReference?: boolean;
  /**
   * Drop the card's own border/background/rounding so a surrounding container
   * (e.g. a floating popover on the screenshot) can provide that chrome.
   */
  embedded?: boolean;
  /**
   * Focus the reply composer on mount. Used when the thread opens in a floating
   * popover, where replying is the primary action.
   */
  autoFocusReply?: boolean;
}) {
  const {
    buildId,
    comment,
    replies = [],
    highlightedCommentId,
    canReply,
    hideScreenshotReference = false,
    embedded = false,
    autoFocusReply = false,
  } = props;
  const projectParams = useProjectParams();
  invariant(projectParams);
  const client = useApolloClient();
  const subscribeToCommentThread = () =>
    client.mutate({
      mutation: SubscribeToCommentThreadMutation,
      variables: { input: { commentId: comment.id } },
      optimisticResponse: {
        subscribeToCommentThread: {
          __typename: "Comment",
          id: comment.id,
          threadSubscribed: true,
        },
      },
    });
  const unsubscribeFromCommentThread = () =>
    client.mutate({
      mutation: UnsubscribeFromCommentThreadMutation,
      variables: { input: { commentId: comment.id } },
      optimisticResponse: {
        unsubscribeFromCommentThread: {
          __typename: "Comment",
          id: comment.id,
          threadSubscribed: false,
        },
      },
    });
  const resolveCommentThread = () =>
    client.mutate({
      mutation: ResolveCommentThreadMutation,
      variables: { input: { commentId: comment.id } },
      optimisticResponse: {
        resolveCommentThread: {
          __typename: "Comment",
          id: comment.id,
          resolvedAt: new Date().toISOString(),
        },
      },
    });
  const unresolveCommentThread = () =>
    client.mutate({
      mutation: UnresolveCommentThreadMutation,
      variables: { input: { commentId: comment.id } },
      optimisticResponse: {
        unresolveCommentThread: {
          __typename: "Comment",
          id: comment.id,
          resolvedAt: null,
        },
      },
    });

  const anchor = (comment.anchor as CommentAnchor | null) ?? null;
  const goToDiff = useGoToCommentDiff({
    commentId: comment.id,
    screenshotDiff: comment.screenshotDiff ?? null,
    anchor,
  });
  // The whole card navigates to the referenced snapshot, not just the
  // reference header — but only where that header is shown; on the screenshot
  // itself (`hideScreenshotReference`) there is nowhere to go.
  const cardNavigates = !hideScreenshotReference && goToDiff != null;
  // Whether a text selection existed at mousedown: the browser collapses the
  // selection before `click` fires, and a click that merely dismisses a
  // selection must not also navigate.
  const hadSelectionRef = useRef(false);
  const handleCardMouseDown = () => {
    hadSelectionRef.current = !isSelectionCollapsed();
  };
  const handleCardClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!goToDiff || !(event.target instanceof Element)) {
      return;
    }
    // Clicks bubbling in from portaled content (menus, dialogs, hover cards)
    // are not on the card itself.
    if (!event.currentTarget.contains(event.target)) {
      return;
    }
    if (event.target.closest(CARD_NAV_EXCLUDE_SELECTOR)) {
      return;
    }
    // Selecting comment text must not navigate.
    if (hadSelectionRef.current || !isSelectionCollapsed()) {
      return;
    }
    goToDiff();
  };

  const resolved = Boolean(comment.resolvedAt);
  // `collapsed` is the stored preference and drives the header label and toggle.
  const [collapsed, setCollapsed] = useCollapsedThread(comment.id, resolved);
  const showBody = !resolved || !collapsed;
  // Deep-linking to a comment inside a resolved thread opens the thread for
  // good (not just for the highlight's lifetime), so the target comment stays
  // visible instead of vanishing when the highlight clears.
  const containsHighlighted =
    highlightedCommentId != null &&
    (highlightedCommentId === comment.id ||
      replies.some((reply) => reply.id === highlightedCommentId));
  useEffect(() => {
    if (resolved && collapsed && containsHighlighted) {
      setCollapsed(false);
    }
  }, [resolved, collapsed, containsHighlighted, setCollapsed]);

  const handleReplySubmit = async (body: EditorValue) => {
    try {
      await client.mutate({
        mutation: AddReplyMutation,
        variables: {
          input: { buildId, threadId: comment.id, body },
          accountSlug: projectParams.accountSlug,
          projectName: projectParams.projectName,
        },
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

  const toggleResolved = () => {
    if (resolved) {
      unresolveCommentThread()
        .then(() => {
          toast.success("Thread reopened.");
        })
        .catch((error) => {
          toast.error(getErrorMessage(error));
        });
    } else {
      resolveCommentThread()
        .then(() => {
          toast.success("Thread resolved.");
        })
        .catch((error) => {
          toast.error(getErrorMessage(error));
        });
    }
  };

  // Only reviewers can resolve a thread; gate the menu action accordingly.
  const onToggleResolved = canReply ? toggleResolved : undefined;

  return (
    <div
      onMouseDown={cardNavigates ? handleCardMouseDown : undefined}
      onClick={cardNavigates ? handleCardClick : undefined}
      className={clsx(
        !embedded && "border-thin bg-app -mx-2.5 rounded-md",
        // Interactive children keep their own cursor (UA styles on buttons,
        // links, editors), so the pointer only shows where a click navigates.
        cardNavigates &&
          "hover:border-hover cursor-pointer **:data-no-card-nav:cursor-auto",
      )}
    >
      {!hideScreenshotReference && comment.screenshotDiff ? (
        <div className="border-b-thin">
          <CommentScreenshotReference
            commentId={comment.id}
            screenshotDiff={comment.screenshotDiff}
            anchor={anchor}
          />
        </div>
      ) : null}
      {resolved ? (
        <ResolvedThreadHeader
          collapsed={collapsed}
          commentCount={replies.length + 1}
          authorName={
            comment.user?.name || comment.user?.slug || "Unknown user"
          }
          onToggle={() => setCollapsed(!collapsed)}
        />
      ) : null}
      <AnimatePresence initial={false}>
        {showBody ? (
          <motion.div
            key="thread-body"
            style={{ overflowY: "clip" }}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={COLLAPSE_TRANSITION}
          >
            <CommentMessage
              comment={comment}
              highlighted={comment.id === highlightedCommentId}
              separated={resolved}
              resolved={resolved}
              threadSubscribed={comment.threadSubscribed}
              onSubscribeThread={subscribeThread}
              onUnsubscribeThread={unsubscribeThread}
              onToggleResolved={onToggleResolved}
            />
            <AnimatePresence initial={false}>
              {replies.map((reply) => (
                <motion.div
                  key={reply.id}
                  style={{ overflowY: "clip" }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={COLLAPSE_TRANSITION}
                >
                  <CommentMessage
                    comment={reply}
                    highlighted={reply.id === highlightedCommentId}
                    isReply
                    separated
                    resolved={resolved}
                    threadSubscribed={comment.threadSubscribed}
                    onSubscribeThread={subscribeThread}
                    onUnsubscribeThread={unsubscribeThread}
                    onToggleResolved={onToggleResolved}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
            {canReply ? (
              <ReplyComposer
                draftKey={`build.${buildId}.thread.${comment.id}.reply`}
                onSubmit={handleReplySubmit}
                autoFocus={autoFocusReply}
              />
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function ResolvedThreadHeader(props: {
  collapsed: boolean;
  commentCount: number;
  authorName: string;
  onToggle: () => void;
}) {
  const { collapsed, commentCount, authorName, onToggle } = props;
  return (
    <Button
      onPress={onToggle}
      aria-label={collapsed ? "Expand thread" : "Collapse thread"}
      className="text-low hover:text-default flex w-full items-center gap-1.5 px-2 py-1.5 text-left text-xs transition select-none"
    >
      {collapsed ? (
        <>
          <MessageSquareCheckIcon className="size-3.5 shrink-0" />
          <span className="min-w-0 flex-1 truncate">
            {commentCount} resolved comment{commentCount > 1 ? "s" : ""} from{" "}
            {authorName}
          </span>
          <ChevronsUpDownIcon className="size-3.5 shrink-0" />
        </>
      ) : (
        <>
          <span className="min-w-0 flex-1">Collapse</span>
          <ChevronsDownUpIcon className="size-3.5 shrink-0" />
        </>
      )}
    </Button>
  );
}

function CommentMessage(props: {
  comment: Comment;
  highlighted: boolean;
  threadSubscribed: boolean;
  onSubscribeThread: () => void;
  onUnsubscribeThread: () => void;
  resolved: boolean;
  onToggleResolved?: () => void;
  separated?: boolean;
  isReply?: boolean;
}) {
  const {
    comment,
    highlighted,
    threadSubscribed,
    onSubscribeThread,
    onUnsubscribeThread,
    resolved,
    onToggleResolved,
    separated = false,
    isReply = false,
  } = props;
  const ref = useRef<HTMLDivElement>(null);
  const clipboard = useClipboard();
  const projectParams = useProjectParams();
  invariant(projectParams);
  const mentions = useMentionableUsers();
  // Resolve the comment's own mentions (which persist only an id) to render
  // their name/avatar/role — these may include users no longer mentionable.
  const mentionedUsers = comment.mentionedUsers.map(getMentionUser);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const client = useApolloClient();

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
      await client.mutate({
        mutation: UpdateCommentMutation,
        variables: {
          input: { id: comment.id, body },
          accountSlug: projectParams.accountSlug,
          projectName: projectParams.projectName,
        },
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
  const contentClassName = isReply ? "pl-7.5 pr-1" : "px-1";

  return (
    <>
      <div
        ref={ref}
        id={comment.id}
        className={clsx(
          "group/comment relative transition",
          separated && "border-t-thin",
        )}
      >
        {/* Highlight drawn as an inset overlay rather than a `ring`, so it
            stays within the comment bounds and is never clipped by the
            surrounding `overflow: clip` containers or the sidebar. */}
        <div
          aria-hidden
          className={clsx(
            "border-primary pointer-events-none absolute inset-0 z-10 rounded-md border-2 transition-opacity",
            highlighted ? "opacity-100" : "opacity-0",
          )}
        />
        <div className="relative flex items-center gap-1.5 px-2 py-1.5 pr-1.5 select-none">
          {comment.user ? (
            <UserHoverCard user={getUserCardData(comment.user)}>
              <span tabIndex={0} className="shrink-0">
                <AccountAvatar
                  avatar={comment.user.avatar}
                  className="size-5 border"
                />
              </span>
            </UserHoverCard>
          ) : null}
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
              {comment.user ? (
                <UserHoverCard user={getUserCardData(comment.user)}>
                  <span
                    tabIndex={0}
                    className="text-default max-w-full min-w-0 text-xs font-medium wrap-break-word"
                  >
                    {comment.user.name || comment.user.slug}
                  </span>
                </UserHoverCard>
              ) : (
                <span className="text-default max-w-full min-w-0 text-xs font-medium break-words">
                  Unknown user
                </span>
              )}
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
              {comment.pending ? <PendingCommentBadge /> : null}
            </div>
          </div>
          <div className="bg-app before:from-app pointer-events-none absolute top-1 right-1 flex items-center rounded-md pl-1 opacity-0 transition group-focus-within/comment:pointer-events-auto group-focus-within/comment:opacity-100 group-hover/comment:pointer-events-auto group-hover/comment:opacity-100 before:absolute before:inset-y-0 before:right-full before:w-8 before:bg-linear-to-l before:to-transparent before:content-[''] has-[button[aria-expanded=true]]:pointer-events-auto has-[button[aria-expanded=true]]:opacity-100">
            <CommentAddReactionButton comment={comment} />
            <CommentActionsMenu
              onCopyLink={copyLink}
              threadSubscribed={threadSubscribed}
              onSubscribeThread={onSubscribeThread}
              onUnsubscribeThread={onUnsubscribeThread}
              resolved={resolved}
              onToggleResolved={onToggleResolved}
              onEdit={canEdit ? () => setIsEditing(true) : undefined}
              onDelete={
                canDelete ? () => setIsDeleteDialogOpen(true) : undefined
              }
            />
          </div>
        </div>
        <div
          className="text-default px-1 pb-2 text-sm select-text"
          data-no-card-nav={isEditing ? "" : undefined}
        >
          {isEditing ? (
            <StandaloneEditor
              variant="plain"
              defaultValue={comment.content}
              mentions={mentions}
              mentionedUsers={mentionedUsers}
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
              mentionedUsers={mentionedUsers}
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

/**
 * Marks a comment that belongs to the current user's not-yet-submitted review.
 * Such comments are visible only to their author until the review is submitted.
 */
function PendingCommentBadge() {
  return (
    <Tooltip content="Only you can see this. It becomes visible when you submit your review.">
      <span className="border-thin text-low shrink-0 cursor-default rounded-full px-1.5 py-0.5 text-[10px] font-medium tracking-wide uppercase">
        Pending
      </span>
    </Tooltip>
  );
}

function ReplyComposer(props: {
  draftKey: string;
  onSubmit: (body: EditorValue) => Promise<void>;
  autoFocus?: boolean;
}) {
  const { draftKey, onSubmit, autoFocus = false } = props;
  const mentions = useMentionableUsers();
  const { initialContent, value, setValue, clear } = useEditorDraft(draftKey);
  const [editorKey, setEditorKey] = useState(0);
  const [isPending, setIsPending] = useState(false);
  const emptyToastId = useId();
  const isEmpty = !hasEditorContent(value);

  const performSubmit = async () => {
    setIsPending(true);
    try {
      await onSubmit(value);
      clear();
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
    <div className="border-t-thin px-2 py-1" data-no-card-nav="">
      <div className="flex items-start gap-1.5">
        <Editor
          key={editorKey}
          defaultValue={initialContent}
          onChange={setValue}
          onSubmit={submit}
          mentions={mentions}
          placeholder="Leave a reply…"
          disabled={isPending}
          autoFocus={autoFocus}
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
