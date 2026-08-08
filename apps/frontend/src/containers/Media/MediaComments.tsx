import { useMemo, useState } from "react";
import { useApolloClient } from "@apollo/client/react";
import { clsx } from "clsx";
import { MapPinIcon, MessageSquareIcon, XIcon } from "lucide-react";

import { CommentCard } from "@/containers/Comment/CommentCard";
import { getCommentThreads } from "@/containers/Comment/commentThreads";
import { MentionableUsersProvider } from "@/containers/Comment/MentionableUsersContext";
import { useCommentRoleScope } from "@/containers/Comment/useCommentRoleScope";
import { useHighlightedCommentId } from "@/containers/Comment/useHighlightedCommentId";
import { DocumentType, graphql } from "@/gql";
import { MediaPermission } from "@/gql/graphql";
import { Button, ButtonIcon } from "@/ui/Button";
import type { EditorValue } from "@/ui/Editor/Editor";
import { StandaloneEditor } from "@/ui/Editor/StandaloneEditor";
import { toast } from "@/ui/Toaster";
import { getErrorMessage } from "@/util/error";

import type { MediaPin, MediaPoint } from "./MediaCommentPins";

const _MediaCommentsFragment = graphql(`
  fragment MediaComments_Media on Media {
    id
    permissions
    comments {
      id
      threadId
      anchor {
        __typename
        ... on CommentPointAnchor {
          x
          y
        }
      }
      ...CommentCard_Comment
    }
  }
`);

type Media = DocumentType<typeof _MediaCommentsFragment>;
type Comment = Media["comments"][number];

const AddMediaCommentMutation = graphql(`
  mutation MediaComments_addMediaComment(
    $input: AddMediaCommentInput!
    $accountSlug: String!
    $projectName: String!
  ) {
    addMediaComment(input: $input) {
      id
      unresolvedCommentCount
      comments {
        id
        threadId
        anchor {
          __typename
          ... on CommentPointAnchor {
            x
            y
          }
        }
        ...CommentCard_Comment
      }
    }
  }
`);

/**
 * Read the point a comment refers to, or null when it is about the whole media.
 *
 * Only point anchors reach a media — a line range describes a textual snapshot —
 * but the schema's anchor is a union, so the narrowing has to be explicit.
 */
function getCommentPoint(comment: Comment): MediaPoint | null {
  const { anchor } = comment;
  if (anchor?.__typename !== "CommentPointAnchor") {
    return null;
  }
  return { x: anchor.x, y: anchor.y };
}

/**
 * Pins for a media's threads, numbered in the order they are listed so the badge
 * on the image and the badge beside the thread always agree.
 */
export function getMediaPins(comments: readonly Comment[]): MediaPin[] {
  const pins: MediaPin[] = [];
  for (const thread of getCommentThreads(comments)) {
    const point = getCommentPoint(thread.root);
    if (point) {
      pins.push({ commentId: thread.root.id, point, index: pins.length + 1 });
    }
  }
  return pins;
}

/**
 * The comment side of the share page: every thread on the media, and a composer.
 *
 * A thread that points at a spot on the image carries its pin's number, so the
 * two halves of the page reference each other without the reader having to guess.
 */
export function MediaComments(props: {
  media: Media;
  pins: MediaPin[];
  selectedCommentId: string | null;
  onSelect: (commentId: string | null) => void;
  /** The point the pending comment will be pinned to, if any. */
  draftPoint: MediaPoint | null;
  placing: boolean;
  onPlacingChange: (placing: boolean) => void;
  onDraftPointChange: (point: MediaPoint | null) => void;
}) {
  const {
    media,
    pins,
    selectedCommentId,
    onSelect,
    draftPoint,
    placing,
    onPlacingChange,
    onDraftPointChange,
  } = props;
  const client = useApolloClient();
  const roleScope = useCommentRoleScope();
  const [replyPending, setReplyPending] = useState(false);

  const canComment = media.permissions.includes(MediaPermission.Comment);
  const threads = getCommentThreads(media.comments);
  const highlightedCommentId = useHighlightedCommentId(
    media.comments.map((comment) => comment.id),
  );

  const pinIndexByCommentId = useMemo(
    () => new Map(pins.map((pin) => [pin.commentId, pin.index])),
    [pins],
  );

  const postComment = async (input: {
    body: EditorValue;
    threadId?: string;
    anchor?: { point: MediaPoint };
  }) => {
    await client.mutate({
      mutation: AddMediaCommentMutation,
      variables: { input: { mediaId: media.id, ...input }, ...roleScope },
    });
  };

  const handleSubmit = async (body: EditorValue) => {
    try {
      await postComment({
        body,
        ...(draftPoint ? { anchor: { point: draftPoint } } : {}),
      });
      onDraftPointChange(null);
      onPlacingChange(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
      // Rethrown so the editor keeps the content and the author can retry.
      throw error;
    }
  };

  return (
    <MentionableUsersProvider value={[]}>
      <div className="flex min-h-0 flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-medium">
            {threads.length === 0 ? "Comments" : `Comments (${threads.length})`}
          </h2>
          {canComment ? (
            <Button
              variant={placing ? "primary" : "secondary"}
              size="small"
              onPress={() => {
                const next = !placing;
                onPlacingChange(next);
                if (!next) {
                  onDraftPointChange(null);
                }
              }}
            >
              <ButtonIcon>{placing ? <XIcon /> : <MapPinIcon />}</ButtonIcon>
              {placing ? "Cancel" : "Pin a comment"}
            </Button>
          ) : null}
        </div>

        {placing && !draftPoint ? (
          <p className="text-low bg-ui rounded-md px-3 py-2 text-xs">
            Click the spot on the image you want to comment on.
          </p>
        ) : null}

        {threads.length === 0 && !canComment ? (
          <p className="text-low flex items-center gap-2 text-sm">
            <MessageSquareIcon className="size-4" />
            No comments yet.
          </p>
        ) : null}

        <div className="flex min-h-0 flex-col gap-3 overflow-y-auto">
          {threads.map((thread) => {
            const index = pinIndexByCommentId.get(thread.root.id);
            return (
              <div
                key={thread.root.id}
                className={clsx(
                  "rounded-lg transition",
                  thread.root.id === selectedCommentId &&
                    "ring-primary ring-2 ring-offset-2",
                )}
                onMouseEnter={() => onSelect(thread.root.id)}
                onMouseLeave={() => onSelect(null)}
              >
                {index !== undefined ? (
                  <div className="text-low text-xxs mb-1 flex items-center gap-1.5">
                    <span className="bg-ui text-default flex size-4 items-center justify-center rounded-full text-[10px] font-semibold tabular-nums">
                      {index}
                    </span>
                    pinned on the image
                  </div>
                ) : null}
                <CommentCard
                  comment={thread.root}
                  replies={thread.replies}
                  highlightedCommentId={highlightedCommentId}
                  canReply={canComment}
                  onReply={async (body) => {
                    setReplyPending(true);
                    try {
                      await postComment({ body, threadId: thread.root.id });
                    } finally {
                      setReplyPending(false);
                    }
                  }}
                  draftKeyPrefix={`media.${media.id}`}
                />
              </div>
            );
          })}
        </div>

        {canComment ? (
          <StandaloneEditor
            onSubmit={handleSubmit}
            draftKey={`media.${media.id}.comment`}
            placeholder={
              draftPoint
                ? "Comment on this spot…"
                : "Leave a comment on this media…"
            }
            submitLabel="Submit the comment"
            disabled={replyPending}
            emptyMessage={{
              title: "Comment required",
              description: "Please add a comment before submitting.",
            }}
            aria-label="Add a comment"
          />
        ) : null}
      </div>
    </MentionableUsersProvider>
  );
}
