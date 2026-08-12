import { memo } from "react";
import { invariant } from "@argos/util/invariant";
import { Link } from "react-router";

import { BuildDiffDetailToolbar } from "@/containers/Build/BuildDiffDetailToolbar";
import {
  DetailToolbar,
  DetailToolbarNav,
  DetailToolbarTitle,
} from "@/containers/Build/toolbar/DetailToolbar";
import {
  NextButton,
  PreviousButton,
} from "@/containers/Build/toolbar/NavButtons";
import { Separator } from "@/ui/Separator";
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
import { VariantFilters } from "./metadata/filters/VariantFilters";
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
      {/* What is about the pane: the view mode, then — rightmost — which variants
          of the snapshot the build covers and which of them moved. Everything
          that acts on the snapshot itself is in `ScreenshotActionsToolbar`,
          under it. */}
      <BuildDiffDetailToolbar diff={diff} snapshotControls={false}>
        <VariantFilters />
        <Separator orientation="vertical" className="mx-1 h-6" />
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
        onPress={() =>
          hasPreviousDiff ? goToPreviousDiff() : goToBuildOverview()
        }
      />
      <NextButton onPress={goToNextDiff} isDisabled={!hasNextDiff} />
    </>
  );
});
