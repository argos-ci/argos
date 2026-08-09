import { useMemo, useState } from "react";
import { useApolloClient } from "@apollo/client/react";
import { clsx } from "clsx";
import { MapPinIcon, XIcon } from "lucide-react";
import { useLocation } from "react-router";

import { useAuth } from "@/containers/Auth";
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
import { Link } from "@/ui/Link";
import { Panel, PanelHeader, PanelTitle } from "@/ui/Panel";
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
      mediaVersionId
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
export function getMediaPins(
  comments: readonly Comment[],
  /** The version on screen. A pin only belongs on the bytes it described. */
  viewedVersionId: string | null,
): MediaPin[] {
  const pins: MediaPin[] = [];
  for (const thread of getCommentThreads(comments)) {
    const point = getCommentPoint(thread.root);
    if (!point) {
      continue;
    }
    // A pin at (0.62, 0.34) described a spot on one upload. Drawing it over a
    // later version — reshot at another size, or fixed so the thing is no longer
    // there — points at the wrong pixel and reads as a claim about the current
    // image that nobody made. The thread still shows in the panel; only its
    // marker is withheld.
    if (thread.root.mediaVersionId !== viewedVersionId) {
      continue;
    }
    pins.push({ commentId: thread.root.id, point, index: pins.length + 1 });
  }
  return pins;
}

/**
 * The comment panel of the share page: every thread on the media, and a composer.
 *
 * The same panel-of-comment-cards the build sidebar renders — shared
 * {@link CommentCard} inside a {@link Panel}, with the build's spacing — so the
 * two surfaces cannot drift apart. A thread that points at a spot on the image
 * carries its pin's number, so the two halves of the page reference each other
 * without the reader having to guess.
 */
export function MediaComments(props: {
  media: Media;
  /** The version on screen — what a new pin will be recorded against. */
  viewedVersionId: string;
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
    viewedVersionId,
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
      variables: {
        input: { mediaId: media.id, mediaVersionId: viewedVersionId, ...input },
        ...roleScope,
      },
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
      <Panel>
        <PanelHeader>
          <PanelTitle>
            {threads.length === 0 ? "Comments" : `Comments (${threads.length})`}
          </PanelTitle>
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
        </PanelHeader>

        <div className="px-3">
          {placing && !draftPoint ? (
            <p className="text-low bg-ui mb-3 rounded-md px-3 py-2 text-xs">
              Click the spot on the image you want to comment on.
            </p>
          ) : null}

          <div className="flex flex-col gap-4 select-none">
            {threads.map((thread) => {
              const index = pinIndexByCommentId.get(thread.root.id);
              return (
                <div
                  key={thread.root.id}
                  onMouseEnter={() => onSelect(thread.root.id)}
                  onMouseLeave={() => onSelect(null)}
                >
                  {index !== undefined ? (
                    <div className="text-low text-xxs mb-1.5 flex items-center gap-1.5">
                      {/* A miniature of the pin drawn on the image — same shape,
                          same border — so the pairing is visual, not just a
                          shared number. */}
                      <span className="rounded-chip border-primary bg-app text-default flex size-4 items-center justify-center rounded-bl-none border text-[10px] font-semibold tabular-nums">
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
                    className={clsx(
                      "transition",
                      thread.root.id === selectedCommentId &&
                        "ring-primary ring-1",
                    )}
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
            <div className={clsx("-mx-1.5 -mb-1.5", threads.length && "mt-3")}>
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
            </div>
          ) : (
            <ReadOnlyNotice hasThreads={threads.length > 0} />
          )}
        </div>
      </Panel>
    </MentionableUsersProvider>
  );
}

/**
 * The composer's stand-in for a viewer who cannot comment: an anonymous visitor
 * gets the fix (logging in), a signed-in visitor without the permission gets the
 * plain fact — but only when there is nothing to read, because next to a live
 * discussion "no comments" would be false and a notice would be noise.
 */
function ReadOnlyNotice(props: { hasThreads: boolean }) {
  const { hasThreads } = props;
  const auth = useAuth();
  const { pathname } = useLocation();

  if (auth.status === "anonymous") {
    return (
      <p className={clsx("text-low text-sm", hasThreads && "mt-3")}>
        <Link href={`/login?r=${encodeURIComponent(pathname)}`}>Login</Link> to
        comment on this media.
      </p>
    );
  }

  if (!hasThreads) {
    return <p className="text-low text-sm">No comments yet.</p>;
  }

  return null;
}
