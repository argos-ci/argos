import { useCallback, useMemo } from "react";
import { useApolloClient } from "@apollo/client/react";

import { useAuth } from "@/containers/Auth";
import { type NormalizedPoint } from "@/containers/Build/projection";
import { type PaneSize } from "@/containers/Build/Zoomer";
import { CommentCard } from "@/containers/Comment/CommentCard";
import { getCommentThreads } from "@/containers/Comment/commentThreads";
import {
  PointCommentLayer,
  type PointCommentThread,
} from "@/containers/Comment/PointCommentLayer";
import { useCommentRoleScope } from "@/containers/Comment/useCommentRoleScope";
import { DocumentType, graphql } from "@/gql";
import { MediaPermission } from "@/gql/graphql";
import { type EditorValue } from "@/ui/Editor/Editor";
import { toast } from "@/ui/Toaster";
import { getErrorMessage } from "@/util/error";

import { createHandleMediaCommentsPrompt } from "./MediaCommentsPrompt";

const _MediaFragment = graphql(`
  fragment MediaCommentLayer_Media on Media {
    id
    url
    permissions
    mentionableUsers {
      id
      ...UserCard_user
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

type Media = DocumentType<typeof _MediaFragment>;
type Comment = Media["comments"][number];

const AddMediaCommentMutation = graphql(`
  mutation MediaCommentLayer_addMediaComment(
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
  }
`);

/**
 * The media's point comments, drawn over the share page's viewer: the shared
 * {@link PointCommentLayer} wired to the media's threads and mutation.
 *
 * Only threads pinned to the version on screen get a marker. A pin at
 * (0.62, 0.34) described a spot on one upload; drawing it over another version
 * would point at the wrong pixel and read as a claim about the current image
 * that nobody made. The threads still show in the sidebar panel.
 */
export function MediaCommentLayer(props: {
  media: Media;
  /** The version on screen — what markers belong to and what a draft records. */
  viewedVersionId: string;
  paneSize: PaneSize | null;
  imgSize: { width: number; height: number };
  placing: boolean;
  onPlacingChange: (placing: boolean) => void;
  /** A thread the sidebar asks to open on the image (see PointCommentLayer). */
  requestedThreadId?: string | null;
  onRequestedThreadConsumed?: () => void;
}) {
  const {
    media,
    viewedVersionId,
    paneSize,
    imgSize,
    placing,
    onPlacingChange,
    requestedThreadId,
    onRequestedThreadConsumed,
  } = props;
  const client = useApolloClient();
  const roleScope = useCommentRoleScope();
  const auth = useAuth();
  const accountId =
    auth.status === "authenticated" ? auth.account?.id : undefined;

  const canComment = media.permissions.includes(MediaPermission.Comment);

  const threads = useMemo(
    () =>
      getCommentThreads(media.comments).flatMap(
        (thread): PointCommentThread<Comment>[] => {
          const { root } = thread;
          if (
            root.anchor?.__typename !== "CommentPointAnchor" ||
            root.mediaVersionId !== viewedVersionId ||
            root.resolvedAt
          ) {
            return [];
          }
          return [{ ...thread, point: { x: root.anchor.x, y: root.anchor.y } }];
        },
      ),
    [media.comments, viewedVersionId],
  );

  const currentAvatar = useMemo(() => {
    if (!accountId) {
      return null;
    }
    return (
      media.mentionableUsers.find((member) => member.id === accountId)
        ?.avatar ?? null
    );
  }, [accountId, media.mentionableUsers]);

  const postComment = useCallback(
    async (input: {
      body: EditorValue;
      threadId?: string;
      anchor?: { point: NormalizedPoint };
    }) => {
      return client.mutate({
        mutation: AddMediaCommentMutation,
        variables: {
          input: {
            mediaId: media.id,
            mediaVersionId: viewedVersionId,
            ...input,
          },
          ...roleScope,
        },
      });
    },
    [client, media.id, viewedVersionId, roleScope],
  );

  const handleCreate = useCallback(
    async (
      body: EditorValue,
      _options: { addToReview: boolean },
      point: NormalizedPoint,
    ): Promise<string | null> => {
      const priorIds = new Set(media.comments.map((comment) => comment.id));
      try {
        const result = await postComment({
          body,
          anchor: { point: { x: point.x, y: point.y } },
        });
        // The pin the button armed has been dropped; the next comment starts
        // from a resting toolbar.
        onPlacingChange(false);
        const created = result.data?.addMediaComment.comments.find(
          (comment) => !priorIds.has(comment.id) && !comment.threadId,
        );
        return created?.id ?? null;
      } catch (error) {
        toast.error(getErrorMessage(error));
        // Rethrow so the editor keeps the content and the user can retry.
        throw error;
      }
    },
    [media.comments, postComment, onPlacingChange],
  );

  return (
    <PointCommentLayer
      paneSize={paneSize}
      imgSize={imgSize}
      // The media image is centered in its pane; the build's snapshots are not.
      verticalAlign="center"
      threads={threads}
      placing={placing && canComment}
      draftAvatar={currentAvatar}
      canAddToReview={false}
      onCreate={handleCreate}
      requestedThreadId={requestedThreadId}
      onRequestedThreadConsumed={onRequestedThreadConsumed}
      // Escape puts the pin tool away once there is nothing left to close.
      onPlacingDismiss={() => onPlacingChange(false)}
      renderThreadCard={(thread) => (
        <CommentCard
          comment={thread.root}
          replies={thread.replies}
          highlightedCommentId={null}
          canReply={canComment}
          onReply={async (body) => {
            await postComment({ body, threadId: thread.root.id });
          }}
          draftKeyPrefix={`media.${media.id}`}
          threadPrompt={createHandleMediaCommentsPrompt({
            shareUrl: media.url,
            threadId: thread.root.id,
          })}
          embedded
          autoFocusReply
        />
      )}
    />
  );
}
