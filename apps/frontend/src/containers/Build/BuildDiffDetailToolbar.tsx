import { use } from "react";
import { invariant } from "@argos/util/invariant";

import { ProjectPermissionsContext } from "@/containers/Project/PermissionsContext";
import { ProjectPermission, ScreenshotDiffStatus } from "@/gql/graphql";
import { useProjectParams } from "@/pages/Project/ProjectParams";
import { ButtonGroup } from "@/ui/ButtonGroup";
import { Separator } from "@/ui/Separator";
import { checkIsImageContentType } from "@/util/content-type";

import type { BuildDiffDetailDocument } from "./BuildDiffDetail";
import { CommentsVisibilityToggle } from "./toolbar/CommentsVisibilityToggle";
import { CommentToolToggle } from "./toolbar/CommentToolToggle";
import { FitToggle } from "./toolbar/FitToggle";
import { HighlightButton } from "./toolbar/HighlightButton";
import {
  GoToNextChangesButton,
  GoToPreviousChangesButton,
} from "./toolbar/NavChangesButton";
import { OverlayToggle } from "./toolbar/OverlayToggle";
import { SettingsButton } from "./toolbar/SettingsButton";
import { SplitViewToggle, ViewToggle } from "./toolbar/ViewToggle";

interface BuildDiffDetailToolbarProps {
  diff: BuildDiffDetailDocument;
  fitControls?: React.ReactNode;
  children?: React.ReactNode;
}

/** Whether point comments can be placed on this diff's changes image. */
function checkCanCommentOnDiff(diff: BuildDiffDetailDocument): boolean {
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

export function BuildDiffDetailToolbar(props: BuildDiffDetailToolbarProps) {
  const { diff, children, fitControls } = props;
  const shouldShowToolbarControls =
    diff.status === ScreenshotDiffStatus.Changed ||
    diff.status === ScreenshotDiffStatus.Ignored;

  const params = useProjectParams();
  invariant(params, "can't be used outside of a project route");

  const permissions = use(ProjectPermissionsContext);
  const canComment = permissions?.includes(ProjectPermission.Review) ?? false;
  const showCommentTools = canComment && checkCanCommentOnDiff(diff);

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <ViewToggle />
      <SplitViewToggle />
      <FitToggle />
      {fitControls}
      {shouldShowToolbarControls && (
        <>
          <Separator orientation="vertical" className="mx-1 h-6" />
          <OverlayToggle />
          <ButtonGroup>
            <GoToPreviousChangesButton />
            <HighlightButton />
            <GoToNextChangesButton />
          </ButtonGroup>
          <SettingsButton />
        </>
      )}
      {showCommentTools && (
        <>
          <Separator orientation="vertical" className="mx-1 h-6" />
          <CommentToolToggle />
          <CommentsVisibilityToggle />
        </>
      )}
      <div className="group contents">
        <Separator
          orientation="vertical"
          className="mx-1 h-6 group-empty:hidden"
        />
        {children}
      </div>
    </div>
  );
}
