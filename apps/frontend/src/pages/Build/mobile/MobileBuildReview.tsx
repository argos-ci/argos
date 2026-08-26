import { useEffect, useState } from "react";
import { useAtom, useSetAtom } from "jotai";
import {
  ArrowLeftRightIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  InfoIcon,
  XIcon,
} from "lucide-react";

import { BuildDiffDetail } from "@/containers/Build/BuildDiffDetail";
import {
  BuildDiffDetailToolbar,
  checkDiffHasChangesOverlay,
} from "@/containers/Build/BuildDiffDetailToolbar";
import {
  buildViewModeAtom,
  checkDiffCanBeBlended,
  holdBaselineAtom,
} from "@/containers/Build/BuildViewMode";
import { ChangesOverlayControls } from "@/containers/Build/ChangesOverlay";
import { DocumentType, graphql } from "@/gql";
import { BuildType } from "@/gql/graphql";
import { BottomSheet } from "@/ui/BottomSheet";
import { Button } from "@/ui/Button";
import { Separator } from "@/ui/Separator";
import { PillTab, TabList, TabPanel, Tabs } from "@/ui/Tab";
import { Tooltip } from "@/ui/Tooltip";

import { BuildDiffList } from "../BuildDiffList";
import {
  checkDiffCanBeReviewed,
  useBuildDiffState,
  useGoToBuildOverview,
  useGoToNextDiff,
  useGoToPreviousDiff,
  useHasNextDiff,
  useHasPreviousDiff,
  type Diff,
} from "../BuildDiffState";
import { BuildInfos } from "../BuildInfos";
import type { BuildParams } from "../BuildParams";
import { BuildReviewButton } from "../BuildReviewButton";
import { FilterChips } from "../metadata/filters/FilterChips";
import { ScreenshotIgnoreButton } from "../ScreenshotActionsToolbar";
import { MetadataSection } from "../sidebar/MetadataSection";
import { ReviewActivitySection } from "../sidebar/ReviewActivitySection";
import { ReviewersSection } from "../sidebar/ReviewersSection";
import { TestActivitySection } from "../sidebar/TestActivitySection";
import { TestChangeSection } from "../sidebar/TestChangeSection";
import { TestInsightsSection } from "../sidebar/TestInsightsSection";
import { TrackButtons } from "../TrackButtons";

const _BuildFragment = graphql(`
  fragment MobileBuildReview_Build on Build {
    ...BuildDiffDetail_Build
    ...BuildInfos_Build
    ...RightSidebar_Build
    type
    subset
    baseBranch
    branch
    deployment {
      id
      url
    }
    pullRequest {
      id
      merged
    }
  }
`);

const _ProjectFragment = graphql(`
  fragment MobileBuildReview_Project on Project {
    ...BuildReviewButton_Project
  }
`);

type Sheet = "snapshots" | "panels" | null;

/**
 * The build diff view on a phone: a slim header, the snapshot full-bleed, a
 * floating dock of the review loop's controls, and the desktop sidebars
 * re-homed into bottom sheets.
 */
export function MobileBuildReview(props: {
  build: DocumentType<typeof _BuildFragment>;
  project: DocumentType<typeof _ProjectFragment>;
  params: BuildParams;
  repoUrl: string | null;
}) {
  const { build, project, params, repoUrl } = props;
  const { activeDiff } = useBuildDiffState();
  const [sheet, setSheet] = useState<Sheet>(null);

  // The stored preference likely says "split" (the desktop default), which
  // wastes a phone screen on two half-width panes. Downgrade it once on
  // entry; a mode picked from the dock afterwards sticks.
  const [viewMode, setViewMode] = useAtom(buildViewModeAtom);
  const [initialViewMode] = useState(viewMode);
  useEffect(() => {
    if (initialViewMode === "split") {
      setViewMode("changes");
    }
  }, [initialViewMode, setViewMode]);

  // Tapping a thumbnail navigates to another diff: the grid has done its job.
  const activeDiffId = activeDiff?.id ?? null;
  const [prevActiveDiffId, setPrevActiveDiffId] = useState(activeDiffId);
  if (activeDiffId !== prevActiveDiffId) {
    setPrevActiveDiffId(activeDiffId);
    setSheet(null);
  }

  return (
    <>
      <MobileHeader
        project={project}
        onOpenSnapshots={() => setSheet("snapshots")}
      />
      <div className="bg-subtle relative flex min-h-0 min-w-0 flex-1 flex-col pb-20">
        <BuildDiffDetail build={build} diff={activeDiff} />
        {activeDiff ? (
          <MobileDock
            diff={activeDiff}
            buildType={build.type ?? null}
            isSubsetBuild={build.subset}
            onOpenPanels={() => setSheet("panels")}
          />
        ) : null}
      </div>
      <BottomSheet
        open={sheet === "snapshots"}
        onOpenChange={(open) => setSheet(open ? "snapshots" : null)}
        aria-label="Snapshots"
        className="h-[85dvh]"
      >
        <div className="flex min-h-0 flex-1 flex-col">
          <FilterChips />
          <BuildDiffList />
        </div>
      </BottomSheet>
      <BottomSheet
        open={sheet === "panels"}
        onOpenChange={(open) => setSheet(open ? "panels" : null)}
        aria-label="Build details"
        className="h-[85dvh]"
      >
        {activeDiff ? (
          <PanelsSheetContent
            build={build}
            diff={activeDiff}
            params={params}
            repoUrl={repoUrl}
          />
        ) : null}
      </BottomSheet>
    </>
  );
}

function MobileHeader(props: {
  project: DocumentType<typeof _ProjectFragment>;
  onOpenSnapshots: () => void;
}) {
  const { activeDiff, diffs } = useBuildDiffState();
  const goToBuildOverview = useGoToBuildOverview();
  const activeIndex = activeDiff ? diffs.indexOf(activeDiff) : -1;
  return (
    <div className="border-b-thin bg-app flex shrink-0 items-center gap-1 p-2">
      <Tooltip content="Build overview">
        <Button
          variant="ghost"
          iconOnly
          aria-label="Build overview"
          onClick={goToBuildOverview}
        >
          <XIcon />
        </Button>
      </Tooltip>
      <button
        type="button"
        aria-label="Open snapshots list"
        className="hover:bg-hover flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-sm"
        onClick={props.onOpenSnapshots}
      >
        {activeIndex >= 0 && (
          <span className="font-medium tabular-nums">
            {activeIndex + 1}/{diffs.length}
          </span>
        )}
        <span className="text-low truncate">{activeDiff?.name}</span>
        <ChevronDownIcon className="text-low size-3.5 shrink-0" />
      </button>
      <BuildReviewButton project={props.project} />
    </div>
  );
}

function MobileDock(props: {
  diff: Diff;
  buildType: BuildType | null;
  isSubsetBuild: boolean;
  onOpenPanels: () => void;
}) {
  const { diff, buildType, isSubsetBuild } = props;
  const [toolsOpen, setToolsOpen] = useState(false);
  const canBeReviewed =
    buildType !== BuildType.Reference &&
    checkDiffCanBeReviewed(diff.status, { isSubsetBuild });
  const hasTools =
    checkDiffHasChangesOverlay(diff) || checkDiffCanBeBlended(diff);
  return (
    <div className="pointer-events-none absolute inset-x-2 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-10 flex justify-center">
      <div className="bg-app border-thin pointer-events-auto flex w-full max-w-md flex-col rounded-3xl px-2 pb-1.5 shadow-lg">
        {hasTools ? (
          <button
            type="button"
            className="text-low flex h-7 items-center justify-center gap-1.5 text-[11px] font-semibold tracking-wider uppercase"
            aria-expanded={toolsOpen}
            onClick={() => setToolsOpen((open) => !open)}
          >
            {toolsOpen ? (
              <ChevronDownIcon className="size-3.5" />
            ) : (
              <ChevronUpIcon className="size-3.5" />
            )}
            Tools
          </button>
        ) : (
          <div className="h-2" />
        )}
        {toolsOpen && hasTools ? (
          <div className="flex items-center gap-1.5 overflow-x-auto px-1 pb-2">
            <ChangesOverlayControls settings={false} />
            <Separator orientation="vertical" className="w-thin h-8" />
            <BuildDiffDetailToolbar diff={diff} snapshotControls={false} />
            <Separator orientation="vertical" className="w-thin h-8" />
            <ScreenshotIgnoreButton diff={diff} />
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-1 px-1">
          <Tooltip content="Info, snapshot and review panels">
            <Button
              variant="ghost"
              iconOnly
              size="large"
              aria-label="Build details"
              onClick={props.onOpenPanels}
            >
              <InfoIcon />
            </Button>
          </Tooltip>
          <MobileNavButtons />
          <HoldBaselineButton disabled={!checkDiffCanBeBlended(diff)} />
          <div className="[&_button]:size-12">
            <TrackButtons diff={diff} disabled={!canBeReviewed} />
          </div>
        </div>
      </div>
    </div>
  );
}

function MobileNavButtons() {
  const goToNextDiff = useGoToNextDiff();
  const hasNextDiff = useHasNextDiff();
  const goToPreviousDiff = useGoToPreviousDiff();
  const hasPreviousDiff = useHasPreviousDiff();
  return (
    <>
      <Button
        variant="ghost"
        iconOnly
        size="large"
        aria-label="Previous snapshot"
        disabled={!hasPreviousDiff}
        onClick={goToPreviousDiff}
      >
        <ChevronLeftIcon />
      </Button>
      <Button
        variant="ghost"
        iconOnly
        size="large"
        aria-label="Next snapshot"
        disabled={!hasNextDiff}
        onClick={goToNextDiff}
      >
        <ChevronRightIcon />
      </Button>
    </>
  );
}

/**
 * Press and hold to look at the baseline, release to come back — the touch
 * translation of flipping with ← / → on desktop.
 */
function HoldBaselineButton(props: { disabled: boolean }) {
  const setHoldBaseline = useSetAtom(holdBaselineAtom);
  // A hold interrupted by anything else (navigation, unmount, a system
  // gesture) must not leave the pane stuck on the baseline.
  useEffect(() => {
    return () => setHoldBaseline(false);
  }, [setHoldBaseline]);
  return (
    <Tooltip content="Hold to show baseline">
      <Button
        variant="primary"
        iconOnly
        size="large"
        className="size-14 touch-none select-none"
        aria-label="Hold to show baseline"
        disabled={props.disabled}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          setHoldBaseline(true);
        }}
        onPointerUp={() => setHoldBaseline(false)}
        onPointerCancel={() => setHoldBaseline(false)}
        onKeyDown={(event) => {
          if (event.key === " " || event.key === "Enter") {
            event.preventDefault();
            setHoldBaseline(true);
          }
        }}
        onKeyUp={() => setHoldBaseline(false)}
        onClick={(event) => event.preventDefault()}
        onContextMenu={(event) => event.preventDefault()}
      >
        <ArrowLeftRightIcon />
      </Button>
    </Tooltip>
  );
}

function PanelsSheetContent(props: {
  build: DocumentType<typeof _BuildFragment>;
  diff: Diff;
  params: BuildParams;
  repoUrl: string | null;
}) {
  const { build, diff, params, repoUrl } = props;
  const { siblingDiffs } = useBuildDiffState();
  const [tab, setTab] = useState("snapshot");
  return (
    <Tabs
      value={tab}
      onValueChange={(value) => {
        if (value) {
          setTab(value);
        }
      }}
      className="flex min-h-0 flex-1 flex-col px-3"
    >
      <TabList aria-label="Build details" className="flex shrink-0 gap-2 py-1">
        <PillTab value="info">Info</PillTab>
        <PillTab value="snapshot">Snapshot</PillTab>
        <PillTab value="review">Review</PillTab>
      </TabList>
      <TabPanel value="info" className="min-h-0 flex-1 overflow-y-auto py-3">
        <BuildInfos build={build} repoUrl={repoUrl} params={params} />
      </TabPanel>
      <TabPanel
        value="snapshot"
        className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto py-3"
      >
        <MetadataSection
          diff={diff}
          siblingDiffs={siblingDiffs}
          repoUrl={repoUrl}
          baseBranch={build.baseBranch ?? null}
          compareBranch={build.branch}
          deploymentUrl={build.deployment?.url ?? null}
          prMerged={build.pullRequest?.merged ?? false}
        />
        {diff.test ? (
          <>
            {diff.change ? (
              <TestChangeSection
                test={diff.test}
                change={diff.change}
                occurrences={diff.last7daysOccurrences}
              />
            ) : null}
            <TestInsightsSection test={diff.test} diff={diff} />
            <TestActivitySection
              test={diff.test}
              change={diff.change ?? null}
            />
          </>
        ) : null}
      </TabPanel>
      <TabPanel
        value="review"
        className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto py-3"
      >
        <ReviewersSection build={build} />
        <ReviewActivitySection build={build} />
      </TabPanel>
    </Tabs>
  );
}
