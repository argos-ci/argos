import { useEffect, useState } from "react";
import { invariant } from "@argos/util/invariant";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import {
  ArrowLeftRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  PanelBottomOpenIcon,
  XIcon,
} from "lucide-react";

import { BuildDiffDetail } from "@/containers/Build/BuildDiffDetail";
import {
  BuildDiffDetailToolbar,
  checkDiffHasChangesOverlay,
  useDiffCommentControlsState,
} from "@/containers/Build/BuildDiffDetailToolbar";
import {
  buildViewModeAtom,
  checkDiffCanBeBlended,
  holdBaselineAtom,
  onionOpacityAtom,
} from "@/containers/Build/BuildViewMode";
import { ChangesOverlayControls } from "@/containers/Build/ChangesOverlay";
import { CommentsVisibilityToggle } from "@/containers/Build/toolbar/CommentsVisibilityToggle";
import { CommentToolToggle } from "@/containers/Build/toolbar/CommentToolToggle";
import {
  NextButton,
  PreviousButton,
} from "@/containers/Build/toolbar/NavButtons";
import { BuildStatusChip } from "@/containers/BuildStatusChip";
import { DocumentType, graphql } from "@/gql";
import { BuildType } from "@/gql/graphql";
import { BottomSheet } from "@/ui/BottomSheet";
import { Button } from "@/ui/Button";
import { Separator } from "@/ui/Separator";
import { Slider } from "@/ui/Slider";
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
    ...BuildStatusChip_Build
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
  const viewMode = useAtomValue(buildViewModeAtom);
  const canBeReviewed =
    buildType !== BuildType.Reference &&
    checkDiffCanBeReviewed(diff.status, { isSubsetBuild });
  const canBlend = checkDiffCanBeBlended(diff);
  const showOverlayControls = checkDiffHasChangesOverlay(diff);
  const { showCommentTool, showComments } = useDiffCommentControlsState(diff);
  return (
    <div className="pointer-events-none absolute inset-x-2 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-10 flex justify-center">
      <div className="bg-app border-thin pointer-events-auto flex w-full max-w-md flex-col rounded-3xl px-2 pb-1.5 shadow-lg">
        <button
          type="button"
          // The full row stays tappable; the pill look keeps "Tools" from
          // reading as a caption for the buttons below it.
          className="flex h-9 items-center justify-center py-1"
          aria-expanded={toolsOpen}
          onClick={() => setToolsOpen((open) => !open)}
        >
          <span className="bg-subtle border-thin text-low flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold tracking-wider uppercase">
            {toolsOpen ? (
              <ChevronDownIcon className="size-3.5" />
            ) : (
              <ChevronUpIcon className="size-3.5" />
            )}
            Tools
          </span>
        </button>
        {toolsOpen ? (
          <div className="flex flex-col gap-1.5 pb-2">
            {viewMode === "onion" && canBlend ? <DockOnionSlider /> : null}
            <div className="relative">
              {/* Commenting and ignoring rank above the view modes: they are
                  review decisions, the rest is display preference. */}
              <div className="flex items-center gap-1.5 overflow-x-auto px-1">
                {showCommentTool ? <CommentToolToggle /> : null}
                {showComments ? <CommentsVisibilityToggle /> : null}
                <ScreenshotIgnoreButton diff={diff} />
                <Separator orientation="vertical" className="w-thin h-8" />
                {showOverlayControls ? (
                  <>
                    <ChangesOverlayControls settings={false} />
                    <Separator orientation="vertical" className="w-thin h-8" />
                  </>
                ) : null}
                <BuildDiffDetailToolbar
                  diff={diff}
                  snapshotControls={false}
                  commentControls={false}
                />
              </div>
              {/* Says "there is more to the right" — the row scrolls, and a
                  bare cut icon was not enough of a hint. */}
              <div className="bg-app pointer-events-none absolute inset-y-0 right-0 w-10 [mask-image:linear-gradient(to_left,black,transparent)]" />
            </div>
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-1 px-1">
          <Tooltip content="Info, snapshot and review panels">
            <Button
              variant="secondary"
              iconOnly
              size="large"
              aria-label="Build details"
              onClick={props.onOpenPanels}
            >
              <PanelBottomOpenIcon />
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

/**
 * The onion-skin slider, in the dock. The pane's own floating control sits
 * exactly where the dock floats at phone width, so it is hidden below `md`
 * and this one takes over — both drive the same atom.
 */
function DockOnionSlider() {
  const [opacity, setOpacity] = useAtom(onionOpacityAtom);
  return (
    // Arrow keys adjust the slider and are also view hotkeys: disable
    // hotkeys while the focus is inside the control.
    <div data-hotkeys-disabled="" className="flex items-center gap-3 px-2 pt-1">
      <span className="text-low text-xs select-none">Baseline</span>
      <Slider
        aria-label="Onion skin opacity"
        className="flex-1"
        min={0}
        max={100}
        value={opacity * 100}
        onValueChange={(next) => {
          invariant(typeof next === "number", "Opacity must be a number");
          setOpacity(next / 100);
        }}
      />
      <span className="text-low text-xs select-none">Changes</span>
    </div>
  );
}

function MobileNavButtons() {
  const goToNextDiff = useGoToNextDiff();
  const hasNextDiff = useHasNextDiff();
  const goToPreviousDiff = useGoToPreviousDiff();
  const hasPreviousDiff = useHasPreviousDiff();
  const goToBuildOverview = useGoToBuildOverview();
  return (
    // The desktop buttons, at touch size.
    <div className="flex gap-1 **:data-[size=medium]:size-12 [&_svg]:size-5!">
      <PreviousButton
        variant="secondary"
        toOverview={!hasPreviousDiff}
        onClick={() =>
          hasPreviousDiff ? goToPreviousDiff() : goToBuildOverview()
        }
      />
      <NextButton
        variant="secondary"
        onClick={goToNextDiff}
        disabled={!hasNextDiff}
      />
    </div>
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
        className="size-12 touch-none select-none"
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
      {/* The header truncates the snapshot name: this is where it lives in
          full. */}
      <div className="shrink-0 pt-3 text-sm font-medium break-words">
        {diff.name}
      </div>
      {/* The desktop pills are mouse-sized; here each tab takes a third of
          the row at touch height. */}
      <TabList aria-label="Build details" className="flex shrink-0 gap-2 py-2">
        <PillTab value="info" className="flex-1 justify-center py-2! text-sm!">
          Info
        </PillTab>
        <PillTab
          value="snapshot"
          className="flex-1 justify-center py-2! text-sm!"
        >
          Snapshot
        </PillTab>
        <PillTab
          value="review"
          className="flex-1 justify-center py-2! text-sm!"
        >
          Review
        </PillTab>
      </TabList>
      <TabPanel
        value="info"
        className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain py-3"
      >
        {/* The slim header dropped the build status chip; a labeled row keeps
            it apart from the snapshot's own status on the pane line. */}
        <div className="text-low mb-1 text-xs font-[450]">Status</div>
        <div className="mb-6">
          <BuildStatusChip build={build} scale="sm" />
        </div>
        <BuildInfos build={build} repoUrl={repoUrl} params={params} />
      </TabPanel>
      <TabPanel
        value="snapshot"
        className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-y-contain py-3"
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
        className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-y-contain py-3"
      >
        <ReviewersSection build={build} />
        <ReviewActivitySection build={build} />
      </TabPanel>
    </Tabs>
  );
}
