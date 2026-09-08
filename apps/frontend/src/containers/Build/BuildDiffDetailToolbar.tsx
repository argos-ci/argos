import { use } from "react";
import { invariant } from "@argos/util/invariant";

import { useProjectPermission } from "@/containers/Project/PermissionsContext";
import { ProjectPermission, ScreenshotDiffStatus } from "@/gql/graphql";
import { useProjectParams } from "@/pages/Project/ProjectParams";
import { Separator } from "@/ui/Separator";
import { checkIsImageContentType } from "@/util/content-type";

import type { BuildDiffDetailDocument } from "./BuildDiffDetail";
import { checkDiffCanBeBlended } from "./BuildViewMode";
import { ChangesOverlayControls } from "./ChangesOverlay";
import { CommentsEnabledContext } from "./CommentsContext";
import { CommentsVisibilityToggle } from "./toolbar/CommentsVisibilityToggle";
import { CommentToolToggle } from "./toolbar/CommentToolToggle";
import { FitToggle } from "./toolbar/FitToggle";
import { SettingsButton } from "./toolbar/SettingsButton";
import { ViewToggle } from "./toolbar/ViewToggle";

interface BuildDiffDetailToolbarProps {
  diff: BuildDiffDetailDocument;
  fitControls?: React.ReactNode;
  /**
   * Whether the controls that act on the snapshot itself belong in this bar —
   * reading its mask, walking its changes, commenting on it. The build page
   * renders them in the actions bar under the snapshot instead, where what
   * they act on is; this bar keeps how the pane is laid out.
   */
  snapshotControls?: boolean;
  /** Render the comment controls; the mobile dock hosts its own copy. */
  commentControls?: boolean;
  /** Render the fit toggle; the mobile dock hosts it ahead of the view modes. */
  fitToggle?: boolean;
  children?: React.ReactNode;
}

/** Whether the diff has a mask, and so overlay controls to go with it. */
export function checkDiffHasChangesOverlay(
  diff: BuildDiffDetailDocument,
): boolean {
  return (
    diff.status === ScreenshotDiffStatus.Changed ||
    diff.status === ScreenshotDiffStatus.Ignored
  );
}

/** Whether point comments can be placed on this diff's changes image. */
export function checkCanCommentOnDiff(diff: BuildDiffDetailDocument): boolean {
  switch (diff.status) {
    case ScreenshotDiffStatus.Changed:
    case ScreenshotDiffStatus.Ignored:
      return checkIsImageContentType(diff.contentType ?? "");
    case ScreenshotDiffStatus.Added:
      return checkIsImageContentType(diff.compareScreenshot?.contentType ?? "");
    default:
      return false;
  }
}

/**
 * Whether line comments can be placed on this diff's textual changes. Mirrors
 * the condition under which the text diff (and its `DiffCommentLayer`) renders.
 */
function checkCanCommentOnTextDiff(diff: BuildDiffDetailDocument): boolean {
  switch (diff.status) {
    case ScreenshotDiffStatus.Changed:
    case ScreenshotDiffStatus.Ignored:
      return !checkIsImageContentType(
        diff.compareScreenshot?.contentType ?? "",
      );
    default:
      return false;
  }
}

/**
 * Which comment controls the current diff and viewer support. Shared with the
 * mobile dock, which hosts the controls itself to put them ahead of the view
 * modes.
 */
export function useDiffCommentControlsState(diff: BuildDiffDetailDocument) {
  const commentsEnabled = use(CommentsEnabledContext);
  const canReview = useProjectPermission(ProjectPermission.Review);
  const canComment = commentsEnabled && canReview;
  // The hand/comment tool switch only makes sense on image diffs (point
  // comments). Text diffs use the gutter "+" instead.
  const showCommentTool = canComment && checkCanCommentOnDiff(diff);
  // The show/hide toggle applies whenever comments can exist on the diff,
  // whether image (point) or text (line) comments.
  const showComments =
    showCommentTool || (canComment && checkCanCommentOnTextDiff(diff));
  return { showCommentTool, showComments };
}

export function BuildDiffDetailToolbar(props: BuildDiffDetailToolbarProps) {
  const {
    diff,
    children,
    fitControls,
    snapshotControls = true,
    commentControls = true,
    fitToggle = true,
  } = props;
  const showOverlayControls = checkDiffHasChangesOverlay(diff);

  const params = useProjectParams();
  invariant(params, "can't be used outside of a project route");

  const { showCommentTool, showComments } = useDiffCommentControlsState(diff);

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <ViewToggle blendEnabled={checkDiffCanBeBlended(diff)} />
      {fitToggle ? <FitToggle /> : null}
      {fitControls}
      {showOverlayControls && (
        <>
          <Separator orientation="vertical" className="w-thin mx-0.5 h-8" />
          {/* Reading the mask happens next to the snapshot; how it is painted
              is a preference, and preferences live up here. */}
          {snapshotControls ? <ChangesOverlayControls /> : <SettingsButton />}
        </>
      )}
      {commentControls && showComments && (
        <>
          <Separator orientation="vertical" className="w-thin mx-0.5 h-8" />
          {showCommentTool && snapshotControls && <CommentToolToggle />}
          <CommentsVisibilityToggle />
        </>
      )}
      <div className="group contents">
        <Separator
          orientation="vertical"
          className="w-thin mx-0.5 h-8 group-empty:hidden"
        />
        {children}
      </div>
    </div>
  );
}
