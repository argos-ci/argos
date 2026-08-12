import { use, useCallback, useMemo } from "react";
import { useApolloClient } from "@apollo/client/react";
import { invariant } from "@argos/util/invariant";
import { useAtom, useAtomValue } from "jotai/react";

import { useAuth } from "@/containers/Auth";
import { CommentsEnabledContext } from "@/containers/Build/CommentsContext";
import {
  commentsVisibleAtom,
  commentToolModeAtom,
  requestedScreenshotCommentIdAtom,
} from "@/containers/Build/CommentTool";
import { type NormalizedPoint } from "@/containers/Build/projection";
import { type PaneSize } from "@/containers/Build/Zoomer";
import { getCommentThreads } from "@/containers/Comment/commentThreads";
import { MentionableUsersProvider } from "@/containers/Comment/MentionableUsersContext";
import {
  PointCommentLayer,
  type PointCommentThread,
} from "@/containers/Comment/PointCommentLayer";
import { useIsThreadAnchorShown } from "@/containers/Comment/useCollapsedThread";
import { useProjectPermission } from "@/containers/Project/PermissionsContext";
import { DocumentType, graphql } from "@/gql";
import { ProjectPermission } from "@/gql/graphql";
import { BuildCommentCard } from "@/pages/Build/sidebar/BuildCommentCard";
import { useProjectParams } from "@/pages/Project/ProjectParams";
import { type EditorValue } from "@/ui/Editor/Editor";
import { toast } from "@/ui/Toaster";
import { getMentionUser } from "@/ui/UserCard";
import { getErrorMessage } from "@/util/error";

import { useCanAddToReview } from "../ReviewCommentSubmitButton";

const _BuildFragment = graphql(`
  fragment ScreenshotCommentLayer_Build on Build {
    id
    members {
      id
      ...UserCard_user
    }
    comments {
      ...BuildCommentCard_Comment
    }
    ...ReviewCommentSubmitButton_Build
  }
`);

type Build = DocumentType<typeof _BuildFragment>;
type Comment = Build["comments"][number];

const AddBuildCommentMutation = graphql(`
  mutation ScreenshotCommentLayer_addBuildComment(
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
 * The build's point comments on the changes image: the shared
 * {@link PointCommentLayer} wired to the build's data — its threads, its
 * comment tool state, the build reply card and the add-to-review submission.
 */
export function ScreenshotCommentLayer(props: {
  build: Build;
  screenshotDiffId: string;
  imgSize: { width: number; height: number };
  paneSize: PaneSize | null;
}) {
  const { build, screenshotDiffId, imgSize, paneSize } = props;
  const commentsEnabled = use(CommentsEnabledContext);
  const mode = useAtomValue(commentToolModeAtom);
  const visible = useAtomValue(commentsVisibleAtom);
  const canReview = useProjectPermission(ProjectPermission.Review);
  const canComment = commentsEnabled && canReview;
  const canAddToReview = useCanAddToReview(build);
  const { accountSlug, projectName } = useProjectParams() ?? {};
  invariant(accountSlug && projectName, "Missing project route params");
  const auth = useAuth();
  const accountId =
    auth.status === "authenticated" ? auth.account?.id : undefined;
  const client = useApolloClient();

  // Threads anchored to a point on this diff. A resolved thread's pin drops off
  // the image until the reviewer expands the thread again (the thread itself
  // remains in the sidebar), and hiding comments drops them all.
  const isAnchorShown = useIsThreadAnchorShown();
  const threads = useMemo(
    () =>
      visible
        ? getCommentThreads(build.comments).flatMap(
            (thread): PointCommentThread<Comment>[] => {
              const { root } = thread;
              if (
                root.screenshotDiff?.id !== screenshotDiffId ||
                root.anchor?.__typename !== "CommentPointAnchor" ||
                !isAnchorShown(root)
              ) {
                return [];
              }
              return [
                { ...thread, point: { x: root.anchor.x, y: root.anchor.y } },
              ];
            },
          )
        : [],
    [visible, build.comments, screenshotDiffId, isAnchorShown],
  );

  // Honor a request to open a specific thread, set when jumping to a comment
  // from outside the viewer (the sidebar's "Go to this snapshot").
  const [requestedCommentId, setRequestedCommentId] = useAtom(
    requestedScreenshotCommentIdAtom,
  );
  const handleRequestedThreadConsumed = useCallback(() => {
    setRequestedCommentId(null);
  }, [setRequestedCommentId]);

  const mentionUsers = useMemo(
    () => build.members.map(getMentionUser),
    [build.members],
  );

  const currentAvatar = useMemo(() => {
    if (!accountId) {
      return null;
    }
    return (
      build.members.find((member) => member.id === accountId)?.avatar ?? null
    );
  }, [accountId, build.members]);

  const handleCreate = useCallback(
    async (
      body: EditorValue,
      options: { addToReview: boolean },
      point: NormalizedPoint,
    ): Promise<string | null> => {
      const priorIds = new Set(build.comments.map((comment) => comment.id));
      try {
        const result = await client.mutate({
          mutation: AddBuildCommentMutation,
          variables: {
            input: {
              buildId: build.id,
              screenshotDiffId,
              anchor: { point: { x: point.x, y: point.y } },
              body,
              addToReview: options.addToReview,
            },
            accountSlug,
            projectName,
          },
        });
        const created = result.data?.addBuildComment.comments.find(
          (comment) => !priorIds.has(comment.id) && !comment.threadId,
        );
        return created?.id ?? null;
      } catch (error) {
        toast.error(getErrorMessage(error));
        // Rethrow so the editor keeps the content and the user can retry.
        throw error;
      }
    },
    [
      client,
      build.comments,
      build.id,
      screenshotDiffId,
      accountSlug,
      projectName,
    ],
  );

  if (!commentsEnabled) {
    return null;
  }

  return (
    <MentionableUsersProvider value={mentionUsers}>
      <PointCommentLayer
        paneSize={paneSize}
        imgSize={imgSize}
        threads={threads}
        placing={mode === "comment" && canComment}
        draftAvatar={currentAvatar}
        canAddToReview={canAddToReview}
        onCreate={handleCreate}
        requestedThreadId={requestedCommentId}
        onRequestedThreadConsumed={handleRequestedThreadConsumed}
        renderThreadCard={(thread) => (
          // The build's own card: it carries the snapshot reference and the
          // build reply mutation, which is why the popover takes it rather
          // than building one itself.
          <BuildCommentCard
            buildId={build.id}
            comment={thread.root}
            replies={thread.replies}
            highlightedCommentId={null}
            canReply={canComment}
            hideScreenshotReference
            embedded
            autoFocusReply
          />
        )}
      />
    </MentionableUsersProvider>
  );
}
