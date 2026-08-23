import { memo } from "react";
import { invariant } from "@argos/util/invariant";
import { Link } from "react-router";

import { BuildDiffDetailToolbar } from "@/containers/Build/BuildDiffDetailToolbar";
import { AriaSnapshotToggle } from "@/containers/Build/toolbar/AriaSnapshotToggle";
import {
  DetailToolbar,
  DetailToolbarNav,
  DetailToolbarTitle,
} from "@/containers/Build/toolbar/DetailToolbar";
import {
  NextButton,
  PreviousButton,
} from "@/containers/Build/toolbar/NavButtons";
import { Tooltip } from "@/ui/Tooltip";

import { useProjectParams } from "../Project/ProjectParams";
import { getTestURL } from "../Test/TestParams";
import {
  Diff,
  useGoToBuildOverview,
  useGoToNextDiff,
  useGoToPreviousDiff,
  useHasNextDiff,
  useHasPreviousDiff,
} from "./BuildDiffState";
import { VariantSwitchers } from "./metadata/variants/VariantSwitchers";
import { RightSidebarToggle } from "./RightSidebar";

export const BuildDetailHeader = memo(function BuildDetailHeader(props: {
  diff: Diff;
}) {
  const { diff } = props;
  const params = useProjectParams();
  invariant(params, "can't be used outside of a project route");

  const testId = diff.test?.id;

  return (
    <DetailToolbar>
      <DetailToolbarNav>
        <BuildNavButtons />
      </DetailToolbarNav>
      <DetailToolbarTitle
        crowded
        render={
          testId
            ? (title) => (
                <Tooltip content="View test details">
                  <Link
                    to={getTestURL(
                      { ...params, testId },
                      { change: diff.change?.id },
                    )}
                    className="group hover:underline-link"
                  >
                    {title}
                  </Link>
                </Tooltip>
              )
            : undefined
        }
      >
        {diff.name}
      </DetailToolbarTitle>
      {/* The variants, then the pane controls — and when there is not room for
          both, the variants fold *under* the controls, even though they come
          first. `flex-wrap-reverse` squares that circle: items fill lines in
          order, so the variants take the first line and the controls the
          second — and reversed stacking puts that first line at the bottom.
          The controls keep their spot on every snapshot; the variants are as
          many as the snapshot happens to have, so they are the ones that move.

          The cluster asks the outer row only for the controls' worth
          (`basis-90`) and grows from there, because a wrapping row places
          items by what they ask, before any shrinking: asking for its full
          content would send the whole cluster under the title as one block the
          moment it stopped fitting. Sized this way it holds line one, and
          whatever width it actually grows to is what decides the fold. It
          grows ahead of the title (`grow-[99]`) but never past its content
          (`max-w-fit`): the free space unfolds the switchers first, and only
          what they leave lengthens the name — the other way round, a long
          name would fold them with room to spare. */}
      <div className="flex max-w-fit min-w-0 shrink grow-[99] basis-90 flex-wrap-reverse items-center justify-end gap-x-4 gap-y-2">
        {/* Which variant of the snapshot is on screen, and the siblings to
            jump to. */}
        <VariantSwitchers diff={diff} />
        {/* What is about the pane: the view mode, the fit, the overlay's
            style, comment visibility. Everything that acts on the snapshot
            itself is in `ScreenshotActionsToolbar`, under it. */}
        <BuildDiffDetailToolbar
          diff={diff}
          snapshotControls={false}
          fitControls={<AriaSnapshotToggle />}
        >
          <RightSidebarToggle />
        </BuildDiffDetailToolbar>
      </div>
    </DetailToolbar>
  );
});

const BuildNavButtons = memo(function BuildNavButtons() {
  const goToNextDiff = useGoToNextDiff();
  const hasNextDiff = useHasNextDiff();
  const goToPreviousDiff = useGoToPreviousDiff();
  const hasPreviousDiff = useHasPreviousDiff();
  const goToBuildOverview = useGoToBuildOverview();
  return (
    <>
      <PreviousButton
        toOverview={!hasPreviousDiff}
        onClick={() =>
          hasPreviousDiff ? goToPreviousDiff() : goToBuildOverview()
        }
      />
      <NextButton onClick={goToNextDiff} disabled={!hasNextDiff} />
    </>
  );
});
