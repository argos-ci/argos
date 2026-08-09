import { useState } from "react";
import { useApolloClient } from "@apollo/client/react";
import { clsx } from "clsx";
import { MapPinIcon, XIcon } from "lucide-react";
import { Button as RACButton } from "react-aria-components";
import { useLocation } from "react-router";

import { useAuth } from "@/containers/Auth";
import { CommentCard } from "@/containers/Comment/CommentCard";
import { getCommentThreads } from "@/containers/Comment/commentThreads";
import { useCommentRoleScope } from "@/containers/Comment/useCommentRoleScope";
import { useHighlightedCommentId } from "@/containers/Comment/useHighlightedCommentId";
import { DocumentType, graphql } from "@/gql";
import { MediaPermission } from "@/gql/graphql";
import { Badge } from "@/ui/Badge";
import { Button, ButtonIcon } from "@/ui/Button";
import type { EditorValue } from "@/ui/Editor/Editor";
import { StandaloneEditor } from "@/ui/Editor/StandaloneEditor";
import { Link } from "@/ui/Link";
import { MediaWell } from "@/ui/MediaFrame";
import { Panel, PanelHeader, PanelTitle } from "@/ui/Panel";
import { toast } from "@/ui/Toaster";
import { getErrorMessage } from "@/util/error";

import { createHandleMediaCommentsPrompt } from "./MediaCommentsPrompt";

const _MediaCommentsFragment = graphql(`
  fragment MediaComments_Media on Media {
    id
    url
    permissions
    versions {
      id
      number
      fileUrl
      posterUrl
      isVideo
    }
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
 * The comment panel of the share page: every thread on the media, and a composer.
 *
 * The same panel-of-comment-cards the build sidebar renders — shared
 * {@link CommentCard} inside a {@link Panel} — so the two surfaces cannot drift
 * apart. Threads pinned to a point also live as markers on the image itself
 * (see `MediaCommentLayer`); the panel is the complete record, including pins
 * on other versions and resolved threads.
 */
export function MediaComments(props: {
  media: Media;
  /** The version on screen — what a new comment will be recorded against. */
  viewedVersionId: string;
  placing: boolean;
  onPlacingChange: (placing: boolean) => void;
  /** Open a pinned thread on the image, switching to its version if needed. */
  onOpenPinned: (comment: {
    id: string;
    mediaVersionId: string | null;
  }) => void;
}) {
  const { media, viewedVersionId, placing, onPlacingChange, onOpenPinned } =
    props;
  const client = useApolloClient();
  const roleScope = useCommentRoleScope();
  const [replyPending, setReplyPending] = useState(false);

  const canComment = media.permissions.includes(MediaPermission.Comment);
  const threads = getCommentThreads(media.comments);
  const highlightedCommentId = useHighlightedCommentId(
    media.comments.map((comment) => comment.id),
  );

  const postComment = async (input: {
    body: EditorValue;
    threadId?: string;
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
      await postComment({ body });
    } catch (error) {
      toast.error(getErrorMessage(error));
      // Rethrown so the editor keeps the content and the author can retry.
      throw error;
    }
  };

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>
          Comments
          {threads.length > 0 ? <Badge>{threads.length}</Badge> : null}
        </PanelTitle>
        {canComment ? (
          <Button
            variant={placing ? "primary" : "secondary"}
            size="small"
            onPress={() => onPlacingChange(!placing)}
          >
            <ButtonIcon>{placing ? <XIcon /> : <MapPinIcon />}</ButtonIcon>
            {placing ? "Cancel" : "Pin a comment"}
          </Button>
        ) : null}
      </PanelHeader>

      <div className="px-3">
        {placing ? (
          <p className="text-low bg-ui mb-3 rounded-md px-3 py-2 text-xs">
            Click the spot on the image you want to comment on.
          </p>
        ) : null}

        {/* `px-1` mirrors the build's `Activity` wrapper, so the cards' edges
            land exactly where the build sidebar puts them. */}
        <div className="flex flex-col gap-4 px-1 select-none">
          {threads.map((thread) => {
            const pinned =
              thread.root.anchor?.__typename === "CommentPointAnchor";
            return (
              <CommentCard
                key={thread.root.id}
                comment={thread.root}
                replies={thread.replies}
                highlightedCommentId={highlightedCommentId}
                canReply={canComment}
                // The build sidebar's exact geometry: wider than the column
                // on purpose, flirting with the panel's edge.
                className="-mx-2.5"
                onReply={async (body) => {
                  setReplyPending(true);
                  try {
                    await postComment({ body, threadId: thread.root.id });
                  } finally {
                    setReplyPending(false);
                  }
                }}
                draftKeyPrefix={`media.${media.id}`}
                threadPrompt={createHandleMediaCommentsPrompt({
                  shareUrl: media.url,
                  threadId: thread.root.id,
                })}
                screenshotReference={
                  pinned
                    ? {
                        node: (
                          <MediaPinnedReference
                            media={media}
                            mediaVersionId={thread.root.mediaVersionId ?? null}
                            viewedVersionId={viewedVersionId}
                            onNavigate={() =>
                              onOpenPinned({
                                id: thread.root.id,
                                mediaVersionId:
                                  thread.root.mediaVersionId ?? null,
                              })
                            }
                          />
                        ),
                        onNavigate: () =>
                          onOpenPinned({
                            id: thread.root.id,
                            mediaVersionId: thread.root.mediaVersionId ?? null,
                          }),
                      }
                    : null
                }
              />
            );
          })}
        </div>

        {canComment ? (
          // The build sidebar's composer inset, between the cards' edge and
          // the column's.
          <div className={clsx("-mx-1.5 -mb-1.5", threads.length && "mt-3")}>
            <StandaloneEditor
              onSubmit={handleSubmit}
              draftKey={`media.${media.id}.comment`}
              placeholder="Leave a comment on this media…"
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

/**
 * A quote of where a pinned thread points — the media page's counterpart of
 * the build's snapshot reference header, so the card reads as clickable the
 * same way. Clicking it (or the card, which shares the navigation) opens the
 * thread's marker on the image, switching the picker to the version the pin
 * was dropped on when needed.
 */
function MediaPinnedReference(props: {
  media: Media;
  mediaVersionId: string | null;
  viewedVersionId: string;
  onNavigate: () => void;
}) {
  const { media, mediaVersionId, viewedVersionId, onNavigate } = props;
  const version =
    media.versions.find((candidate) => candidate.id === mediaVersionId) ?? null;
  const thumbnailUrl = version
    ? version.isVideo
      ? version.posterUrl
      : version.fileUrl
    : null;
  const label =
    mediaVersionId === viewedVersionId
      ? "Pinned on the image"
      : version
        ? `Pinned on v${version.number}`
        : "Pinned on another version";
  return (
    <RACButton
      onPress={onNavigate}
      aria-label="Go to the pinned comment"
      // No hover style or default cursor of its own: the surrounding card
      // shares this button's navigation and carries the hover affordance.
      className="text-low rac-focus flex w-full cursor-pointer items-center gap-2 rounded-t-md px-2 py-1.5 text-left text-xs select-none"
    >
      {thumbnailUrl ? (
        <MediaWell checkerSize={3} className="size-6 shrink-0">
          <img src={thumbnailUrl} alt="" className="size-full object-cover" />
        </MediaWell>
      ) : null}
      <span className="min-w-0 flex-1 truncate font-medium">{label}</span>
      <MapPinIcon aria-hidden="true" className="size-3.5 shrink-0" />
    </RACButton>
  );
}
