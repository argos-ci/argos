import { use, useCallback, useMemo, useState } from "react";
import { useApolloClient } from "@apollo/client/react";
import { invariant } from "@argos/util/invariant";
import type {
  DiffLineAnnotation,
  SelectedLineRange,
  SupportedLanguages,
} from "@pierre/diffs/react";
import { useAtomValue } from "jotai/react";
import { toast } from "sonner";

import { useAuthTokenPayload } from "@/containers/Auth";
import { CommentsEnabledContext } from "@/containers/Build/CommentsContext";
import { commentsVisibleAtom } from "@/containers/Build/CommentTool";
import { DiffEditor } from "@/containers/Build/DiffEditor";
import { useProjectPermission } from "@/containers/Project/PermissionsContext";
import { DocumentType, graphql } from "@/gql";
import { ProjectPermission } from "@/gql/graphql";
import { useProjectParams } from "@/pages/Project/ProjectParams";
import { type EditorValue } from "@/ui/Editor/Editor";
import { getMentionUser } from "@/ui/UserCard";
import { getErrorMessage } from "@/util/error";

import { useCanAddToReview } from "../ReviewCommentSubmitButton";
import { CommentCard } from "../sidebar/CommentCard";
import {
  getCommentThreads,
  type CommentThread,
} from "../sidebar/commentThreads";
import { MentionableUsersProvider } from "../sidebar/MentionableUsersContext";
import { DiffCommentDraft } from "./DiffCommentDraft";

const _BuildFragment = graphql(`
  fragment DiffCommentLayer_Build on Build {
    id
    members {
      id
      ...UserCard_user
    }
    comments {
      ...CommentCard_Comment
    }
    ...ReviewCommentSubmitButton_Build
  }
`);

type Build = DocumentType<typeof _BuildFragment>;
type Comment = Build["comments"][number];

const AddBuildCommentMutation = graphql(`
  mutation DiffCommentLayer_addBuildComment(
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

type LineRange = { from: number; to: number };

/**
 * Metadata carried by an inline annotation: the comment threads anchored to a
 * head line plus, if the user is composing there, the draft range.
 */
type DiffCommentAnnotation = {
  threads: CommentThread<Comment>[];
  draftRange: LineRange | null;
};

/**
 * Wraps the textual {@link DiffEditor} with line comments, mirroring the
 * point-anchored {@link import("../screenshotComments/ScreenshotCommentLayer")}
 * for image diffs. Hovering a line shows a gutter "+"; clicking (or
 * drag-selecting) it opens an inline composer that anchors the comment to that
 * line range. Existing line-anchored threads render inline between the lines.
 *
 * Anchors store a side-less `{ from, to }` range, which maps to the head
 * (compare) snapshot's line numbers — i.e. the `additions` side of the diff.
 * Context and addition lines report that side (the whole unified column, or the
 * right column in split view), so commenting works on every line that exists in
 * the new version. Pure deletions and the baseline column report `deletions` and
 * can't be anchored to a head line, so the "+" is a no-op there.
 */
export function DiffCommentLayer(props: {
  build: Build;
  screenshotDiffId: string;
  original: string;
  modified: string;
  originalLanguage: SupportedLanguages;
  modifiedLanguage: SupportedLanguages;
  renderSideBySide: boolean;
}) {
  const {
    build,
    screenshotDiffId,
    original,
    modified,
    originalLanguage,
    modifiedLanguage,
    renderSideBySide,
  } = props;
  const commentsEnabled = use(CommentsEnabledContext);
  const visible = useAtomValue(commentsVisibleAtom) && commentsEnabled;
  const canReview = useProjectPermission(ProjectPermission.Review);
  const canComment = commentsEnabled && canReview;
  const canAddToReview = useCanAddToReview(build);
  const { accountSlug, projectName } = useProjectParams() ?? {};
  invariant(accountSlug && projectName, "Missing project route params");
  const accountId = useAuthTokenPayload()?.account.id;
  const client = useApolloClient();

  const [draft, setDraft] = useState<LineRange | null>(null);
  // The range being drag-selected right now (before it's committed to a draft).
  // Echoed into `selectedLines` so the highlight tracks the drag live.
  const [dragRange, setDragRange] = useState<SelectedLineRange | null>(null);
  // The id of the comment thread currently hovered, so its lines light up while
  // pointing at it — that's how you tell a multi-line comment's scope. Tracked by
  // id (not a raw range) so deleting the hovered comment clears the highlight,
  // even though its removal means `onMouseLeave` never fires.
  const [hoveredThreadId, setHoveredThreadId] = useState<string | null>(null);

  // Clearing the draft (cancel or submit) clears the line highlight too.
  const closeDraft = useCallback(() => {
    setDraft(null);
    setDragRange(null);
  }, []);

  const mentionUsers = useMemo(
    () => build.members.map(getMentionUser),
    [build.members],
  );

  // The current user's avatar, shown on the draft composer.
  const currentAvatar = useMemo(
    () =>
      accountId
        ? (build.members.find((member) => member.id === accountId)?.avatar ??
          null)
        : null,
    [accountId, build.members],
  );

  // Threads anchored to a line range on this diff. Resolved threads drop off the
  // diff (they remain in the sidebar).
  const threads = useMemo(
    () =>
      getCommentThreads(build.comments).filter(
        (thread) =>
          thread.root.screenshotDiff?.id === screenshotDiffId &&
          thread.root.anchor?.__typename === "CommentLinesAnchor" &&
          !thread.root.resolvedAt,
      ),
    [build.comments, screenshotDiffId],
  );

  // The hovered thread's line range, derived from the live list so it resolves
  // to null once that thread is gone (e.g. deleted), clearing the highlight.
  const hoveredRange = useMemo<LineRange | null>(() => {
    const anchor = threads.find((thread) => thread.root.id === hoveredThreadId)
      ?.root.anchor;
    return anchor?.__typename === "CommentLinesAnchor"
      ? { from: anchor.from, to: anchor.to }
      : null;
  }, [threads, hoveredThreadId]);

  // The draft is only meaningful while comments are shown.
  const activeDraft = visible ? draft : null;

  // One inline annotation per head line that carries content: the threads
  // anchored there (by the end of their range) plus the draft if it ends there.
  const lineAnnotations = useMemo<
    DiffLineAnnotation<DiffCommentAnnotation>[]
  >(() => {
    const byLine = new Map<number, DiffCommentAnnotation>();
    const ensure = (line: number): DiffCommentAnnotation => {
      let entry = byLine.get(line);
      if (!entry) {
        entry = { threads: [], draftRange: null };
        byLine.set(line, entry);
      }
      return entry;
    };
    if (visible) {
      for (const thread of threads) {
        const { anchor } = thread.root;
        if (anchor?.__typename === "CommentLinesAnchor") {
          ensure(anchor.to).threads.push(thread);
        }
      }
    }
    if (activeDraft) {
      ensure(activeDraft.to).draftRange = activeDraft;
    }
    return Array.from(byLine, ([lineNumber, metadata]) => ({
      side: "additions",
      lineNumber,
      metadata,
    }));
  }, [threads, activeDraft, visible]);

  const handleCreate = useCallback(
    async (body: EditorValue, options: { addToReview: boolean }) => {
      if (!draft) {
        return;
      }
      try {
        await client.mutate({
          mutation: AddBuildCommentMutation,
          variables: {
            input: {
              buildId: build.id,
              screenshotDiffId,
              anchor: { lines: { from: draft.from, to: draft.to } },
              body,
              addToReview: options.addToReview,
            },
            accountSlug,
            projectName,
          },
        });
        closeDraft();
      } catch (error) {
        toast.error(getErrorMessage(error));
        // Rethrow so the composer keeps the content and the user can retry.
        throw error;
      }
    },
    [
      client,
      build.id,
      draft,
      screenshotDiffId,
      accountSlug,
      projectName,
      closeDraft,
    ],
  );

  const renderAnnotation = useCallback(
    (annotation: DiffLineAnnotation<DiffCommentAnnotation>) => {
      const { threads: lineThreads, draftRange } = annotation.metadata;
      return (
        // `font-sans` opts out of the diff's monospace font for the comments.
        <div className="bg-subtle flex flex-col gap-2 border-y px-3 py-2 font-sans text-sm leading-normal">
          {lineThreads.map((thread) => (
            <div
              key={thread.root.id}
              className="bg-app border-thin overflow-hidden rounded-md"
              // Light up the lines this comment is anchored to while hovering it.
              onMouseEnter={() => setHoveredThreadId(thread.root.id)}
              onMouseLeave={() => setHoveredThreadId(null)}
            >
              <CommentCard
                buildId={build.id}
                comment={thread.root}
                replies={thread.replies}
                highlightedCommentId={null}
                canReply={canComment}
                hideScreenshotReference
                embedded
              />
            </div>
          ))}
          {draftRange ? (
            <DiffCommentDraft
              avatar={currentAvatar}
              canAddToReview={canAddToReview}
              onSubmit={handleCreate}
              onCancel={closeDraft}
            />
          ) : null}
        </div>
      );
    },
    [
      build.id,
      canComment,
      canAddToReview,
      currentAvatar,
      handleCreate,
      closeDraft,
    ],
  );

  const onGutterUtilityClick = useCallback((range: SelectedLineRange) => {
    // Only the additions (head) side carries the line numbers our anchor stores;
    // the baseline column and pure deletions can't be anchored to a head line.
    const endSide = range.endSide ?? range.side;
    if (range.side !== "additions" || endSide !== "additions") {
      return;
    }
    setDraft({
      from: Math.min(range.start, range.end),
      to: Math.max(range.start, range.end),
    });
  }, []);

  // Echo the live drag range so the highlight follows the pointer; it's dropped
  // on release (the committed range then comes from the draft, via onGutterUtilityClick).
  const onLineSelectionChange = useCallback(
    (range: SelectedLineRange | null) => setDragRange(range),
    [],
  );
  const onLineSelectionEnd = useCallback(() => setDragRange(null), []);

  // Controlled highlight, in priority order: the live drag range, then the open
  // draft's range, then the hovered thread's range. Driving it means clearing
  // the draft also clears the highlight.
  const selectedLines = useMemo<SelectedLineRange | null>(() => {
    if (dragRange) {
      return dragRange;
    }
    const range = activeDraft ?? hoveredRange;
    return range
      ? {
          start: range.from,
          side: "additions",
          end: range.to,
          endSide: "additions",
        }
      : null;
  }, [dragRange, activeDraft, hoveredRange]);

  const gutterEnabled = canComment && visible;

  const comments = useMemo(
    () => ({
      lineAnnotations,
      selectedLines,
      enableGutterUtility: gutterEnabled,
      renderAnnotation,
      onGutterUtilityClick,
      onLineSelectionChange,
      onLineSelectionEnd,
    }),
    [
      lineAnnotations,
      selectedLines,
      gutterEnabled,
      renderAnnotation,
      onGutterUtilityClick,
      onLineSelectionChange,
      onLineSelectionEnd,
    ],
  );

  return (
    <MentionableUsersProvider value={mentionUsers}>
      <DiffEditor<DiffCommentAnnotation>
        original={original}
        modified={modified}
        originalLanguage={originalLanguage}
        modifiedLanguage={modifiedLanguage}
        renderSideBySide={renderSideBySide}
        comments={comments}
      />
    </MentionableUsersProvider>
  );
}
