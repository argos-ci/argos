import { memo, use } from "react";

import {
  checkCanCommentOnDiff,
  checkDiffHasChangesOverlay,
} from "@/containers/Build/BuildDiffDetailToolbar";
import { CommentsEnabledContext } from "@/containers/Build/CommentsContext";
import { AriaSnapshotToggle } from "@/containers/Build/toolbar/AriaSnapshotToggle";
import { CommentToolToggle } from "@/containers/Build/toolbar/CommentToolToggle";
import { HighlightButton } from "@/containers/Build/toolbar/HighlightButton";
import { IgnoreButton } from "@/containers/Build/toolbar/IgnoreButton";
import {
  GoToNextChangesButton,
  GoToPreviousChangesButton,
} from "@/containers/Build/toolbar/NavChangesButton";
import { OverlayToggle } from "@/containers/Build/toolbar/OverlayToggle";
import { useProjectPermission } from "@/containers/Project/PermissionsContext";
import { BuildType, ProjectPermission } from "@/gql/graphql";
import { ButtonGroup } from "@/ui/ButtonGroup";
import { Separator } from "@/ui/Separator";
import { useEventCallback } from "@/ui/useEventCallback";

import { checkDiffCanBeReviewed, type Diff } from "./BuildDiffState";
import {
  useAcknowledgeMarkedDiff,
  useBuildDiffStatusState,
} from "./BuildReviewState";
import { EvaluationStatus } from "./EvaluationStatus";
import { TrackButtons } from "./TrackButtons";

/**
 * Everything a reviewer does *to the snapshot in front of them*, as a floating
 * bar under it: first read the change — show the mask, circle the changed areas,
 * step through them, restyle the mask, fit the image — then judge it: approve,
 * reject, ignore, comment.
 *
 * The line is what the control acts on, not what kind of control it is. These
 * land on the image and get pressed again on every snapshot, so they sit next to
 * it. What is about the pane rather than the picture — the view mode, the
 * variant filters, the sidebars, comment visibility — stays in the top bar.
 *
 * It floats over the bottom of the pane instead of following the snapshot: a
 * full-page capture is several thousand pixels tall, and an action bar that
 * scrolls away is one the reviewer has to go looking for.
 */
export const ScreenshotActionsToolbar = memo(
  function ScreenshotActionsToolbar(props: {
    diff: Diff;
    buildType: BuildType | null;
    isSubsetBuild: boolean;
  }) {
    const { diff, buildType, isSubsetBuild } = props;
    const canBeReviewed =
      buildType !== BuildType.Reference &&
      checkDiffCanBeReviewed(diff.status, { isSubsetBuild });

    const commentsEnabled = use(CommentsEnabledContext);
    const canReview = useProjectPermission(ProjectPermission.Review);
    // Point comments are placed on the changes image, so the tool only makes
    // sense where there is one to click.
    const showCommentTool =
      commentsEnabled && canReview && checkCanCommentOnDiff(diff);

    return (
      <div className="pointer-events-none absolute inset-x-0 bottom-4 z-10 flex justify-center">
        {/* Left to right, the order a snapshot is dealt with: see the change,
            walk through it, read it as a tree instead, annotate it, then rule on
            it. The verdict is last, at the end the eye arrives at and under
            "Submit review". */}
        <div className="bg-app border-thin pointer-events-auto flex items-center gap-1.5 rounded-full px-2 py-1.5 shadow-md">
          {checkDiffHasChangesOverlay(diff) ? (
            <>
              <OverlayToggle />
              <ButtonGroup>
                <GoToPreviousChangesButton />
                <HighlightButton />
                <GoToNextChangesButton />
              </ButtonGroup>
              <Separator orientation="vertical" className="mx-0.5 h-6" />
            </>
          ) : null}
          <AriaSnapshotToggle />
          {showCommentTool ? <CommentToolToggle /> : null}
          <Separator orientation="vertical" className="mx-0.5 h-6" />
          <ScreenshotIgnoreButton diff={diff} />
          <TrackButtons diff={diff} disabled={!canBeReviewed} />
        </div>
      </div>
    );
  },
);

function ScreenshotIgnoreButton(props: { diff: Diff }) {
  const { diff } = props;

  const [status, setStatus] = useBuildDiffStatusState({
    diffId: diff.id,
    diffGroup: diff.group ?? null,
  });
  const [checkIsPending, acknowledge] = useAcknowledgeMarkedDiff();

  const handleIgnoreChange = useEventCallback(() => {
    if (checkIsPending()) {
      return;
    }

    if (status === EvaluationStatus.Pending) {
      setStatus(EvaluationStatus.Accepted);
      acknowledge();
    }
  });

  return <IgnoreButton diff={diff} onIgnoreChange={handleIgnoreChange} />;
}
