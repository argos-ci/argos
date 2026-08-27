import { startTransition, useEffect, useRef, useState } from "react";
import { invariant } from "@argos/util/invariant";
import { clsx } from "clsx";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import {
  ArrowLeftRightIcon,
  ImagesIcon,
  InfoIcon,
  SearchIcon,
  XIcon,
} from "lucide-react";

import {
  BaselineScreenshotHeader,
  BuildDiffDetail,
  ChangesScreenshotHeader,
} from "@/containers/Build/BuildDiffDetail";
import {
  BuildDiffDetailToolbar,
  checkDiffHasChangesOverlay,
  useDiffCommentControlsState,
} from "@/containers/Build/BuildDiffDetailToolbar";
import { getDiffGroupDefinition } from "@/containers/Build/BuildDiffGroup";
import {
  buildViewModeAtom,
  checkDiffCanBeBlended,
  checkIsBlendViewMode,
  holdBaselineAtom,
  onionOpacityAtom,
  useEffectiveBuildViewMode,
} from "@/containers/Build/BuildViewMode";
import { ChangesOverlayControls } from "@/containers/Build/ChangesOverlay";
import { CommentsVisibilityToggle } from "@/containers/Build/toolbar/CommentsVisibilityToggle";
import { CommentToolToggle } from "@/containers/Build/toolbar/CommentToolToggle";
import { FitToggle } from "@/containers/Build/toolbar/FitToggle";
import {
  NextButton,
  PreviousButton,
} from "@/containers/Build/toolbar/NavButtons";
import { BuildStatusChip } from "@/containers/BuildStatusChip";
import { DocumentType, graphql } from "@/gql";
import { BuildType, ScreenshotDiffStatus } from "@/gql/graphql";
import { BottomSheet } from "@/ui/BottomSheet";
import { Button } from "@/ui/Button";
import { Chip } from "@/ui/Chip";
import { Separator } from "@/ui/Separator";
import { Slider } from "@/ui/Slider";
import { PillTab, TabList, TabPanel, Tabs } from "@/ui/Tab";
import { Tooltip } from "@/ui/Tooltip";
import { useIsShortViewport } from "@/ui/useIsMobile";

import { BuildDiffList } from "../BuildDiffList";
import {
  checkDiffCanBeReviewed,
  useBuildDiffState,
  useSearchModeState,
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
import { SearchInput } from "../LeftSidebar";
import { FilterButton } from "../metadata/filters/FilterButton";
import { FilterChips } from "../metadata/filters/FilterChips";
import { ScreenshotIgnoreButton } from "../ScreenshotActionsToolbar";
import { MetadataRow } from "../sidebar/metadata/MetadataRow";
import { MetadataSection } from "../sidebar/MetadataSection";
import { ReviewActivitySection } from "../sidebar/ReviewActivitySection";
import { ReviewersSection } from "../sidebar/ReviewersSection";
import { TestActivitySection } from "../sidebar/TestActivitySection";
import { TestChangeSection } from "../sidebar/TestChangeSection";
import { TestInsightsSection } from "../sidebar/TestInsightsSection";
import { TrackButtons } from "../TrackButtons";
import { MobileBuildIdentity } from "./MobileBuildHeader";

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
  // Landscape phones: the portrait chrome stacked would leave the snapshot a
  // sliver, so the context moves into the header, the tools become a strip
  // and the dock a right-hand rail.
  const isShort = useIsShortViewport();

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
      <div className="border-b-thin bg-app shrink-0">
        <MobileHeader
          build={build}
          project={project}
          params={params}
          center={
            isShort ? (
              <LandscapeSnapshotContext
                onOpenSnapshots={() => setSheet("snapshots")}
                onOpenPanels={() => setSheet("panels")}
              />
            ) : null
          }
        />
        {!isShort && (
          <SnapshotContextBar
            onOpenSnapshots={() => setSheet("snapshots")}
            onOpenPanels={() => setSheet("panels")}
          />
        )}
      </div>
      {isShort && activeDiff ? (
        <div className="border-b-thin bg-app shrink-0 px-2 pt-1">
          <DockTools diff={activeDiff} />
        </div>
      ) : null}
      <div
        className={clsx(
          "bg-subtle flex min-h-0 min-w-0 flex-1",
          isShort ? "flex-row" : "flex-col",
        )}
      >
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
          <PaneLabelLine build={build} floating={isShort} />
          <BuildDiffDetail build={build} diff={activeDiff} />
        </div>
        {activeDiff ? (
          <MobileDock
            diff={activeDiff}
            buildType={build.type ?? null}
            isSubsetBuild={build.subset}
            onOpenPanels={() => setSheet("panels")}
            vertical={isShort}
          />
        ) : null}
      </div>
      <BottomSheet
        open={sheet === "snapshots"}
        onOpenChange={(open) => setSheet(open ? "snapshots" : null)}
        aria-label="Snapshots"
        className="h-[85dvh]"
      >
        <SnapshotsSheetContent />
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
  build: DocumentType<typeof _BuildFragment>;
  project: DocumentType<typeof _ProjectFragment>;
  params: BuildParams;
  /** Landscape: the snapshot context, folded into this row. */
  center?: React.ReactNode;
}) {
  return (
    // Symmetric padding on purpose: an odd row height lands the status
    // chip's hairline on a half-pixel, and iOS drops its bottom edge.
    <div className="border-b-thin flex items-center gap-2 p-2">
      <MobileBuildIdentity params={props.params} />
      <BuildStatusChip build={props.build} scale="sm" />
      <div className="flex min-w-0 flex-1 items-center justify-center gap-1">
        {props.center}
      </div>
      {/* The short label: "Submit review" crowds the identity and the chip
          out of a 390px header. */}
      <BuildReviewButton project={props.project}>Submit</BuildReviewButton>
    </div>
  );
}

/** The context bar's occupants at header size, for landscape. */
function LandscapeSnapshotContext(props: {
  onOpenSnapshots: () => void;
  onOpenPanels: () => void;
}) {
  const { activeDiff } = useBuildDiffState();
  return (
    <>
      <Tooltip content="Snapshots list">
        <Button
          variant="secondary"
          iconOnly
          size="small"
          aria-label="Snapshots list"
          onClick={props.onOpenSnapshots}
        >
          <ImagesIcon />
        </Button>
      </Tooltip>
      <button
        type="button"
        aria-label="Snapshot details"
        className="hover:bg-hover min-w-0 truncate rounded-lg px-2 py-1 text-sm"
        onClick={props.onOpenPanels}
      >
        {activeDiff?.name}
      </button>
    </>
  );
}

/**
 * The line under the header naming what is on screen: the list opener and
 * the snapshot's name — up to two lines before it gives up, tap for its
 * details.
 */
function SnapshotContextBar(props: {
  onOpenSnapshots: () => void;
  onOpenPanels: () => void;
}) {
  const { activeDiff } = useBuildDiffState();
  return (
    <div className="flex items-center gap-1 px-2 py-1.5">
      <Tooltip content="Snapshots list">
        <Button
          variant="secondary"
          iconOnly
          aria-label="Snapshots list"
          onClick={props.onOpenSnapshots}
        >
          <ImagesIcon />
        </Button>
      </Tooltip>
      <button
        type="button"
        aria-label="Snapshot details"
        className="hover:bg-hover flex min-w-0 flex-1 items-center rounded-lg px-2 py-1 text-sm"
        onClick={props.onOpenPanels}
      >
        <span className="text-default line-clamp-2 text-left break-all">
          {activeDiff?.name}
        </span>
      </button>
    </div>
  );
}

/**
 * The snapshots list with the desktop sidebar's search and filter on top —
 * the tabs are the only part of that header without a mobile life.
 */
function SnapshotsSheetContent() {
  const { searchMode, setSearchMode } = useSearchModeState();
  const searchInputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-1 px-2 pb-1">
        {searchMode ? (
          <>
            <SearchInput ref={searchInputRef} />
            <Button
              variant="ghost"
              iconOnly
              aria-label="Exit search"
              onClick={() => setSearchMode(false)}
            >
              <XIcon />
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="ghost"
              iconOnly
              aria-label="Find a snapshot"
              onClick={() => {
                // The input autofocuses on mount, which is what pops the
                // keyboard.
                startTransition(() => setSearchMode(true));
              }}
            >
              <SearchIcon />
            </Button>
            <div className="flex-1" />
          </>
        )}
        <FilterButton />
      </div>
      <FilterChips />
      <BuildDiffList />
    </div>
  );
}

/**
 * Which side of the comparison the pane below shows — Baseline, Changes or
 * both — flipping live while the baseline button is held. The desktop pane
 * headers, with their build details on press.
 */
function PaneLabelLine(props: {
  build: DocumentType<typeof _BuildFragment>;
  /** Landscape: float over the snapshot instead of taking a line. */
  floating?: boolean;
}) {
  const { activeDiff } = useBuildDiffState();
  const viewMode = useEffectiveBuildViewMode();
  const canBlend = activeDiff ? checkDiffCanBeBlended(activeDiff) : false;
  // Mirrors the panes: a blend view that cannot blend falls back to split,
  // and blend views compare both sides.
  const blend = checkIsBlendViewMode(viewMode) && canBlend;
  const effectiveViewMode =
    checkIsBlendViewMode(viewMode) && !canBlend ? "split" : viewMode;
  const showBaseline =
    blend || effectiveViewMode === "split" || effectiveViewMode === "baseline";
  const showChanges =
    blend || effectiveViewMode === "split" || effectiveViewMode === "changes";
  const labels = (
    <>
      {showBaseline ? <BaselineScreenshotHeader build={props.build} /> : null}
      {showChanges ? <ChangesScreenshotHeader build={props.build} /> : null}
    </>
  );
  if (props.floating) {
    return (
      <div className="pointer-events-none absolute top-1 right-2 z-10">
        <div className="bg-app/85 pointer-events-auto flex items-center gap-4 rounded-full px-3 py-0.5 shadow-xs">
          {labels}
        </div>
      </div>
    );
  }
  return (
    // In the snapshot's gray zone, where desktop keeps these labels.
    <div className="flex shrink-0 items-center justify-center gap-6 pt-2">
      {labels}
    </div>
  );
}

/**
 * The tools strip: the diff-reading controls lead — the layer and its zones
 * are what you work the snapshot with; the rest follows.
 */
function DockTools(props: { diff: Diff }) {
  const { diff } = props;
  const viewMode = useAtomValue(buildViewModeAtom);
  const canBlend = checkDiffCanBeBlended(diff);
  const showOverlayControls = checkDiffHasChangesOverlay(diff);
  const { showCommentTool, showComments } = useDiffCommentControlsState(diff);
  return (
    <div className="flex flex-col gap-1.5">
      {viewMode === "onion" && canBlend ? <DockOnionSlider /> : null}
      <div className="relative">
        {/* `pb-2` inside the scroller: a visible horizontal scrollbar gets
            its own lane instead of covering the buttons. */}
        <div className="flex items-center gap-1.5 overflow-x-auto px-1 pb-2">
          {showOverlayControls ? (
            <>
              <ChangesOverlayControls settings={false} />
              <Separator orientation="vertical" className="w-thin h-8" />
            </>
          ) : null}
          {showCommentTool ? <CommentToolToggle /> : null}
          {showComments ? <CommentsVisibilityToggle /> : null}
          <ScreenshotIgnoreButton diff={diff} />
          <Separator orientation="vertical" className="w-thin h-8" />
          <FitToggle />
          <BuildDiffDetailToolbar
            diff={diff}
            snapshotControls={false}
            commentControls={false}
            fitToggle={false}
          />
        </div>
        {/* Says "there is more to the right" — the row scrolls, and a bare
            cut icon was not enough of a hint. */}
        <div className="bg-app pointer-events-none absolute inset-y-0 right-0 w-10 [mask-image:linear-gradient(to_left,black,transparent)]" />
      </div>
    </div>
  );
}

function MobileDock(props: {
  diff: Diff;
  buildType: BuildType | null;
  isSubsetBuild: boolean;
  onOpenPanels: () => void;
  /** Landscape: a right-hand rail instead of a bottom bar. */
  vertical?: boolean;
}) {
  const { diff, buildType, isSubsetBuild, vertical } = props;
  const canBeReviewed =
    buildType !== BuildType.Reference &&
    checkDiffCanBeReviewed(diff.status, { isSubsetBuild });
  const canBlend = checkDiffCanBeBlended(diff);
  if (vertical) {
    return (
      // 40px circles: six of them plus gaps have to clear a 390px-tall
      // landscape viewport minus the header and the tools strip.
      <div className="flex shrink-0 items-center py-2 pr-[max(0.5rem,env(safe-area-inset-right))] pl-1">
        <div className="bg-app border-thin flex flex-col items-center gap-1 rounded-3xl p-1 shadow-lg">
          <Tooltip content="Build, snapshot and activity panels">
            <Button
              variant="secondary"
              iconOnly
              size="large"
              className="size-10"
              aria-label="Build details"
              onClick={props.onOpenPanels}
            >
              <InfoIcon />
            </Button>
          </Tooltip>
          <MobileNavButtons vertical />
          <HoldBaselineButton disabled={!canBlend} compact />
          <div className="[&_button]:size-10 [&>div]:flex-col">
            <TrackButtons diff={diff} disabled={!canBeReviewed} />
          </div>
        </div>
      </div>
    );
  }
  return (
    // In the layout flow, not floating: the dock never covers the snapshot.
    <div className="flex shrink-0 justify-center px-2 pt-1.5 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="bg-app border-thin flex w-full max-w-md flex-col rounded-3xl px-2 pt-2 pb-1.5 shadow-lg">
        <DockTools diff={diff} />
        <div className="flex items-center justify-between gap-1 px-1">
          <Tooltip content="Build, snapshot and activity panels">
            <Button
              variant="secondary"
              iconOnly
              size="large"
              className="size-12"
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

function MobileNavButtons(props: { vertical?: boolean }) {
  const goToNextDiff = useGoToNextDiff();
  const hasNextDiff = useHasNextDiff();
  const goToPreviousDiff = useGoToPreviousDiff();
  const hasPreviousDiff = useHasPreviousDiff();
  const goToBuildOverview = useGoToBuildOverview();
  return (
    // The desktop buttons, at touch size.
    <div
      className={clsx(
        "flex gap-1 [&_svg]:size-5!",
        props.vertical
          ? "flex-col **:data-[size=medium]:size-10"
          : "**:data-[size=medium]:size-12",
      )}
    >
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
function HoldBaselineButton(props: { disabled: boolean; compact?: boolean }) {
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
        className={clsx(
          props.compact ? "size-10" : "size-12",
          "touch-none select-none",
        )}
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
      {/* The desktop pills are mouse-sized; here each tab takes a third of
          the row at touch height. */}
      <TabList aria-label="Build details" className="flex shrink-0 gap-2 py-2">
        <PillTab
          value="snapshot"
          className="flex-1 justify-center py-2! text-sm!"
        >
          Snapshot
        </PillTab>
        <PillTab value="build" className="flex-1 justify-center py-2! text-sm!">
          Build
        </PillTab>
        <PillTab
          value="activity"
          className="flex-1 justify-center py-2! text-sm!"
        >
          Activity
        </PillTab>
      </TabList>
      <TabPanel
        value="build"
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
          leadingRows={<SnapshotIdentityRows diff={diff} />}
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
        value="activity"
        className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-y-contain py-3"
      >
        <ReviewersSection build={build} />
        <ReviewActivitySection build={build} />
      </TabPanel>
    </Tabs>
  );
}

/**
 * The sheet's slim header truncates the snapshot name and the pane line only
 * chips its status: the metadata panel restates both in full.
 */
function SnapshotIdentityRows(props: { diff: Diff }) {
  const { diff } = props;
  const group =
    diff.status === ScreenshotDiffStatus.Pending
      ? null
      : getDiffGroupDefinition(diff.status);
  return (
    <>
      <MetadataRow>
        <div className="text-default min-w-0 text-sm font-medium break-words">
          {diff.name}
        </div>
      </MetadataRow>
      {group ? (
        <MetadataRow>
          <Chip icon={group.icon} color={group.color}>
            {group.label}
          </Chip>
        </MetadataRow>
      ) : null}
    </>
  );
}
