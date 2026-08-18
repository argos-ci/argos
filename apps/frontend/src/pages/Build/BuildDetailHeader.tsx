import { memo } from "react";
import { invariant } from "@argos/util/invariant";
import { WaypointsIcon } from "lucide-react";
import { Link } from "react-router";

import { BuildDiffDetailToolbar } from "@/containers/Build/BuildDiffDetailToolbar";
import { AriaSnapshotToggle } from "@/containers/Build/toolbar/AriaSnapshotToggle";
import {
  DetailToolbar,
  DetailToolbarNav,
  DetailToolbarTitle,
} from "@/containers/Build/toolbar/DetailToolbar";
import { IgnoreButton } from "@/containers/Build/toolbar/IgnoreButton";
import {
  NextButton,
  PreviousButton,
} from "@/containers/Build/toolbar/NavButtons";
import { BuildType } from "@/gql/graphql";
import { Button } from "@/ui/Button";
import { Separator } from "@/ui/Separator";
import { Tooltip } from "@/ui/Tooltip";
import { useEventCallback } from "@/ui/useEventCallback";

import { useProjectParams } from "../Project/ProjectParams";
import { getTestURL } from "../Test/TestParams";
import {
  checkDiffCanBeReviewed,
  Diff,
  useActiveDiffFlow,
  useFlowMinimapState,
  useGoToBuildOverview,
  useGoToNextDiff,
  useGoToPreviousDiff,
  useHasNextDiff,
  useHasPreviousDiff,
} from "./BuildDiffState";
import {
  useAcknowledgeMarkedDiff,
  useBuildDiffStatusState,
} from "./BuildReviewState";
import { EvaluationStatus } from "./EvaluationStatus";
import { RightSidebarToggle } from "./RightSidebar";
import { TrackButtons } from "./TrackButtons";

export const BuildDetailHeader = memo(function BuildDetailHeader(props: {
  diff: Diff;
  buildType: BuildType | null;
  isSubsetBuild: boolean;
}) {
  const { diff, buildType, isSubsetBuild } = props;
  const canBeReviewed =
    buildType !== BuildType.Reference &&
    checkDiffCanBeReviewed(diff.status, { isSubsetBuild });

  const params = useProjectParams();
  invariant(params, "can't be used outside of a project route");

  const testId = diff.test?.id;

  return (
    <DetailToolbar>
      <DetailToolbarNav>
        <BuildNavButtons />
      </DetailToolbarNav>
      <div className="flex min-w-0 flex-1 flex-col">
        <FlowLine />
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
      </div>
      <BuildDiffDetailToolbar diff={diff} fitControls={<AriaSnapshotToggle />}>
        <FlowMinimapToggle />
        <BuildDetailIgnoreButton diff={diff} />
        <TrackButtons diff={diff} disabled={!canBeReviewed} />
        <Separator orientation="vertical" className="mx-1 h-6" />
        <RightSidebarToggle />
      </BuildDiffDetailToolbar>
    </DetailToolbar>
  );
});

function BuildDetailIgnoreButton(props: { diff: Diff }) {
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

/**
 * Journey context above the screenshot name: the flow's name and the step
 * position, secondary and single-line, with a link to the flow view.
 */
function FlowLine() {
  const flow = useActiveDiffFlow();
  if (!flow) {
    return null;
  }
  return (
    <div className="text-low flex min-w-0 items-center gap-1.5 text-xs">
      <span className="truncate" title={flow.identity.key}>
        {flow.identity.title}
        {flow.stepIndex !== -1
          ? ` · ${flow.stepIndex + 1}/${flow.steps.length}`
          : null}
      </span>
    </div>
  );
}

/** Same look and behavior as the other toolbar toggles. */
function FlowMinimapToggle() {
  const flow = useActiveDiffFlow();
  const { visible, setVisible } = useFlowMinimapState();
  if (!flow) {
    return null;
  }
  return (
    <Tooltip content={visible ? "Hide flow minimap" : "Show flow minimap"}>
      <Button
        variant="secondary"
        iconOnly
        aria-label="Flow minimap"
        aria-pressed={visible}
        onClick={() => setVisible(!visible)}
      >
        <WaypointsIcon />
      </Button>
    </Tooltip>
  );
}

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
