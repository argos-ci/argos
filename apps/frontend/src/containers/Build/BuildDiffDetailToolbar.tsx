import { use } from "react";
import { invariant } from "@argos/util/invariant";

import { useProjectPermission } from "@/containers/Project/PermissionsContext";
import { ProjectPermission, ScreenshotDiffStatus } from "@/gql/graphql";
import { useProjectParams } from "@/pages/Project/ProjectParams";
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

export function BuildDiffDetailToolbar(props: BuildDiffDetailToolbarProps) {
  const { diff, children, fitControls, snapshotControls = true } = props;
  const showOverlayControls = checkDiffHasChangesOverlay(diff);

  const params = useProjectParams();
  invariant(params, "can't be used outside of a project route");

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

  return (
    // Space tells the groups apart, no rule between them — and the same space
    // that sets the variant switchers apart from this whole bar, so the row has
    // one distance meaning "a different kind of thing" at every level of it.
    // Within a group the controls sit close, which is what makes them a group.
    <div className="flex shrink-0 items-center gap-4">
      <ToolGroup>
        <ViewToggle blendEnabled={checkDiffCanBeBlended(diff)} />
        <FitToggle />
        {fitControls}
      </ToolGroup>
      {showOverlayControls && (
        <ToolGroup>
          {/* Reading the mask happens next to the snapshot; how it is painted
              is a preference, and preferences live up here. */}
          {snapshotControls ? <ChangesOverlayControls /> : <SettingsButton />}
        </ToolGroup>
      )}
      {showComments && (
        <ToolGroup>
          {showCommentTool && snapshotControls && <CommentToolToggle />}
          <CommentsVisibilityToggle />
        </ToolGroup>
      )}
      <ToolGroup>{children}</ToolGroup>
    </div>
  );
}

/**
 * Controls that answer the same question, kept together — and a group is why
 * the bar can be read at all, now that nothing is ruled off.
 *
 * `empty:hidden` because an empty group would otherwise leave its space
 * behind: the page decides what `children` is, and on some pages it is
 * nothing.
 */
function ToolGroup(props: { children?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 empty:hidden">
      {props.children}
    </div>
  );
}
