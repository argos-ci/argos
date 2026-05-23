import { memo } from "react";
import { invariant } from "@argos/util/invariant";
import { Link } from "react-router-dom";

import { BuildDiffDetailToolbar } from "@/containers/Build/BuildDiffDetailToolbar";
import { AriaSnapshotToggle } from "@/containers/Build/toolbar/AriaSnapshotToggle";
import { IgnoreButton } from "@/containers/Build/toolbar/IgnoreButton";
import {
  NextButton,
  PreviousButton,
} from "@/containers/Build/toolbar/NavButtons";
import { BuildType } from "@/gql/graphql";
import { Separator } from "@/ui/Separator";
import { Tooltip } from "@/ui/Tooltip";
import { useEventCallback } from "@/ui/useEventCallback";

import { useProjectParams } from "../Project/ProjectParams";
import { getTestURL } from "../Test/TestParams";
import {
  checkDiffCanBeReviewed,
  Diff,
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

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <BuildNavButtons />
      <div className="flex min-w-0 flex-1">
        {diff.test ? (
          <Tooltip content="View test details">
            <Link
              to={getTestURL(
                { ...params, testId: diff.test.id },
                { change: diff.change?.id },
              )}
              className="group hover:underline-link"
            >
              <span
                role="heading"
                aria-level={1}
                className="line-clamp-2 text-sm font-medium"
              >
                {diff.name}
              </span>
            </Link>
          </Tooltip>
        ) : (
          <div role="heading" className="line-clamp-2 text-sm font-medium">
            {diff.name}
          </div>
        )}
      </div>
      <BuildDiffDetailToolbar diff={diff} fitControls={<AriaSnapshotToggle />}>
        <BuildDetailIgnoreButton diff={diff} />
        <TrackButtons diff={diff} disabled={!canBeReviewed} />
        <Separator orientation="vertical" className="mx-1 h-6" />
        <RightSidebarToggle />
      </BuildDiffDetailToolbar>
    </div>
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

const BuildNavButtons = memo(function BuildNavButtons() {
  const goToNextDiff = useGoToNextDiff();
  const hasNextDiff = useHasNextDiff();
  const goToPreviousDiff = useGoToPreviousDiff();
  const hasPreviousDiff = useHasPreviousDiff();
  return (
    <div className="flex shrink-0 gap-1">
      <PreviousButton
        onPress={goToPreviousDiff}
        isDisabled={!hasPreviousDiff}
      />
      <NextButton onPress={goToNextDiff} isDisabled={!hasNextDiff} />
    </div>
  );
});
