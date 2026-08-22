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
      {/* Which variant of the snapshot is on screen, and the siblings to jump
          to. */}
      <VariantSwitchers diff={diff} />
      {/* What is about the pane: the view mode, the fit, the overlay's style,
          comment visibility. Everything that acts on the snapshot itself is in
          `ScreenshotActionsToolbar`, under it. */}
      <BuildDiffDetailToolbar
        diff={diff}
        snapshotControls={false}
        fitControls={<AriaSnapshotToggle />}
      >
        <RightSidebarToggle />
      </BuildDiffDetailToolbar>
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
