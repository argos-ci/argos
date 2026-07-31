import { useApolloClient } from "@apollo/client/react";
import { invariant } from "@argos/util/invariant";

import { CommentCard } from "@/containers/Comment/CommentCard";
import { DocumentType, graphql } from "@/gql";
import { useProjectParams } from "@/pages/Project/ProjectParams";
import type { EditorValue } from "@/ui/Editor/Editor";

import {
  CommentScreenshotReference,
  useGoToCommentDiff,
  type CommentAnchor,
} from "./CommentScreenshotReference";

const _CommentFragment = graphql(`
  fragment BuildCommentCard_Comment on Comment {
    id
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
    ...CommentCard_Comment
  }
`);

type Comment = DocumentType<typeof _CommentFragment>;

const AddReplyMutation = graphql(`
  mutation BuildCommentCard_addBuildComment(
    $input: AddBuildCommentInput!
    $accountSlug: String!
    $projectName: String!
  ) {
    addBuildComment(input: $input) {
      id
      comments {
        ...BuildCommentCard_Comment
      }
    }
  }
`);

/**
 * A comment thread on a build: the shared {@link CommentCard} wired to the build
 * reply mutation and to the snapshot the thread points at.
 */
export function BuildCommentCard(props: {
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
    hideScreenshotReference = false,
    ...cardProps
  } = props;
  const projectParams = useProjectParams();
  invariant(projectParams);
  const client = useApolloClient();

  const anchor = (comment.anchor as CommentAnchor | null) ?? null;
  const screenshotDiff = comment.screenshotDiff ?? null;
  const goToDiff = useGoToCommentDiff({
    commentId: comment.id,
    screenshotDiff,
    anchor,
  });

  const handleReply = async (body: EditorValue) => {
    await client.mutate({
      mutation: AddReplyMutation,
      variables: {
        input: { buildId, threadId: comment.id, body },
        accountSlug: projectParams.accountSlug,
        projectName: projectParams.projectName,
      },
    });
  };

  return (
    <CommentCard
      {...cardProps}
      comment={comment}
      onReply={handleReply}
      draftKeyPrefix={`build.${buildId}`}
      screenshotReference={
        !hideScreenshotReference && screenshotDiff && goToDiff
          ? {
              node: (
                <CommentScreenshotReference
                  commentId={comment.id}
                  screenshotDiff={screenshotDiff}
                  anchor={anchor}
                />
              ),
              onNavigate: goToDiff,
            }
          : null
      }
    />
  );
}
