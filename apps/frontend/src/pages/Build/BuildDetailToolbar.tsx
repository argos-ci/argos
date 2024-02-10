import {
  ShrinkIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  EyeIcon,
  ColumnsIcon,
} from "lucide-react";
import { clsx } from "clsx";
import { memo } from "react";

import { ButtonGroup } from "@/ui/ButtonGroup";
import { HotkeyTooltip } from "@/ui/HotkeyTooltip";
import { IconButton } from "@/ui/IconButton";

import { useBuildDiffFitState } from "./BuildDiffFitState";
import { Diff, useBuildDiffState } from "./BuildDiffState";
import { useBuildDiffVisibleState } from "./BuildDiffVisibleState";
import { useBuildHotkey } from "./BuildHotkeys";
import { useZoomerSyncContext } from "./Zoomer";
import { useBuildDiffViewModeState } from "./useBuildDiffViewModeState";
import { AutomationLibraryIndicator } from "./metadata/automationLibrary/AutomationLibraryIndicator";
import { BrowserIndicator } from "./metadata/browser/BrowserIndicator";
import { SdkIndicator } from "./metadata/sdk/SdkIndicator";
import { ViewportIndicator } from "./metadata/viewport/ViewportIndicator";
import { UrlIndicator } from "./metadata/url/UrlIndicator";
import { ColorSchemeIndicator } from "./metadata/colorScheme/ColorSchemeIndicator";
import { MediaTypeIndicator } from "./metadata/mediaType/MediaTypeIndicator";
import { TestIndicator } from "./metadata/test/TestIndicator";
import { TraceIndicator } from "./metadata/trace/TraceIndicator";

const BuildDiffChangesOverlayToggle = memo(() => {
  const { visible, setVisible } = useBuildDiffVisibleState();
  const toggle = () => setVisible((visible) => !visible);
  const hotkey = useBuildHotkey("toggleChangesOverlay", toggle, {
    preventDefault: true,
  });
  return (
    <HotkeyTooltip
      description={visible ? "Hide changes overlay" : "Show changes overlay"}
      keys={hotkey.displayKeys}
    >
      <IconButton color="danger" aria-pressed={visible} onClick={toggle}>
        <EyeIcon />
      </IconButton>
    </HotkeyTooltip>
  );
});

const BuildDiffFitToggle = memo(() => {
  const { contained, setContained } = useBuildDiffFitState();
  const { reset } = useZoomerSyncContext();
  const toggle = () => {
    setContained((contained) => !contained);
    reset();
  };
  const hotkey = useBuildHotkey("toggleDiffFit", toggle, {
    preventDefault: true,
  });
  return (
    <HotkeyTooltip
      description={contained ? "Expand the screenshot" : "Fit the screenshot"}
      keys={hotkey.displayKeys}
    >
      <IconButton aria-pressed={contained} onClick={toggle}>
        <ShrinkIcon />
      </IconButton>
    </HotkeyTooltip>
  );
});

const BuildVisibleDiffButtonGroup = memo(() => {
  const { viewMode, setViewMode } = useBuildDiffViewModeState();
  const toggleBaselineChanges = () => {
    setViewMode((viewMode) =>
      viewMode === "changes" ? "baseline" : "changes",
    );
  };
  const hotkey = useBuildHotkey(
    "toggleBaselineChanges",
    toggleBaselineChanges,
    { preventDefault: true },
  );

  if (viewMode === "split") {
    return null;
  }

  return (
    <ButtonGroup>
      <HotkeyTooltip
        description={hotkey.description}
        keys={hotkey.displayKeys}
        keysEnabled={viewMode !== "baseline"}
      >
        <IconButton
          aria-pressed={viewMode === "baseline"}
          onClick={toggleBaselineChanges}
        >
          Baseline
        </IconButton>
      </HotkeyTooltip>
      <HotkeyTooltip
        description={hotkey.description}
        keys={hotkey.displayKeys}
        keysEnabled={viewMode !== "changes"}
      >
        <IconButton
          aria-pressed={viewMode === "changes"}
          onClick={toggleBaselineChanges}
        >
          Changes
        </IconButton>
      </HotkeyTooltip>
    </ButtonGroup>
  );
});

const BuildSplitViewToggle = memo(() => {
  const { viewMode, setViewMode } = useBuildDiffViewModeState();
  const { reset } = useZoomerSyncContext();
  const toggleSplitView = () => {
    setViewMode((viewMode) => (viewMode === "split" ? "changes" : "split"));
    reset();
  };
  const hotkey = useBuildHotkey("toggleSplitView", toggleSplitView, {
    preventDefault: true,
  });
  return (
    <HotkeyTooltip
      description={
        viewMode === "split"
          ? "Show new screenshot only"
          : "Show baseline and changes side by side"
      }
      keys={hotkey.displayKeys}
    >
      <IconButton aria-pressed={viewMode === "split"} onClick={toggleSplitView}>
        <ColumnsIcon />
      </IconButton>
    </HotkeyTooltip>
  );
});

const NextDiffButton = memo(() => {
  const { diffs, activeDiff, setActiveDiff, expanded } = useBuildDiffState();
  const activeDiffIndex = activeDiff ? diffs.indexOf(activeDiff) : -1;
  const disabled = activeDiffIndex >= diffs.length - 1;
  const goToNextDiff = () => {
    if (disabled) return;

    const isGroupExpanded =
      !activeDiff?.group || expanded.includes(activeDiff.group);
    if (isGroupExpanded) {
      const nextDiff = diffs[activeDiffIndex + 1];
      if (nextDiff) setActiveDiff(nextDiff, true);
      return;
    }

    const offsetIndex = activeDiffIndex + 1;
    const nextDiffIndex = diffs
      .slice(offsetIndex)
      .findIndex((diff) => diff.group !== activeDiff.group);
    if (nextDiffIndex !== -1) {
      const nextDiff = diffs[nextDiffIndex + offsetIndex];
      if (nextDiff) setActiveDiff(nextDiff, true);
    }
  };
  const hotkey = useBuildHotkey("goToNextDiff", goToNextDiff, {
    preventDefault: true,
    enabled: !disabled,
    allowInInput: true,
  });
  return (
    <HotkeyTooltip description={hotkey.description} keys={hotkey.displayKeys}>
      <IconButton disabled={disabled} onClick={goToNextDiff}>
        <ArrowDownIcon />
      </IconButton>
    </HotkeyTooltip>
  );
});

const PreviousDiffButton = memo(() => {
  const { diffs, activeDiff, setActiveDiff, expanded } = useBuildDiffState();
  const activeDiffIndex = activeDiff ? diffs.indexOf(activeDiff) : -1;
  const disabled = activeDiffIndex <= 0;
  const goToPreviousDiff = () => {
    if (disabled) return;

    const previousDiffIndex = activeDiffIndex - 1;
    const previousDiff = diffs[previousDiffIndex];
    if (!previousDiff) return;

    const isGroupExpanded =
      !previousDiff.group || expanded.includes(previousDiff.group);
    if (isGroupExpanded) {
      setActiveDiff(previousDiff, true);
      return;
    }

    const newDiffIndex = diffs
      .slice(0, previousDiffIndex)
      .findIndex((diff) => diff.group === previousDiff.group);
    if (newDiffIndex !== -1) {
      const newDiff = diffs[newDiffIndex];
      if (newDiff) setActiveDiff(newDiff, true);
    }
  };
  const hotkey = useBuildHotkey("goToPreviousDiff", goToPreviousDiff, {
    preventDefault: true,
    enabled: !disabled,
    allowInInput: true,
  });
  return (
    <HotkeyTooltip description={hotkey.description} keys={hotkey.displayKeys}>
      <IconButton disabled={disabled} onClick={goToPreviousDiff}>
        <ArrowUpIcon />
      </IconButton>
    </HotkeyTooltip>
  );
});

export const BuildDetailToolbar = memo(
  ({
    activeDiff,
    baseBranch,
    compareBranch,
    bordered,
    repoUrl,
    prMerged,
  }: {
    activeDiff: Diff;
    bordered: boolean;
    repoUrl: string | null;
    baseBranch: string | null;
    compareBranch: string | null;
    prMerged: boolean;
  }) => {
    const automationLibrary =
      activeDiff.compareScreenshot?.metadata?.automationLibrary ??
      activeDiff.baseScreenshot?.metadata?.automationLibrary ??
      null;
    const browser =
      activeDiff.compareScreenshot?.metadata?.browser ??
      activeDiff.baseScreenshot?.metadata?.browser ??
      null;
    const sdk =
      activeDiff.compareScreenshot?.metadata?.sdk ??
      activeDiff.baseScreenshot?.metadata?.sdk ??
      null;
    const viewport =
      activeDiff.compareScreenshot?.metadata?.viewport ??
      activeDiff.baseScreenshot?.metadata?.viewport ??
      null;
    const url =
      activeDiff.compareScreenshot?.metadata?.url ??
      activeDiff.baseScreenshot?.metadata?.url ??
      null;
    const colorScheme =
      activeDiff.compareScreenshot?.metadata?.colorScheme ??
      activeDiff.baseScreenshot?.metadata?.colorScheme ??
      null;
    const mediaType =
      activeDiff.compareScreenshot?.metadata?.mediaType ??
      activeDiff.baseScreenshot?.metadata?.mediaType ??
      null;
    const test =
      activeDiff.compareScreenshot?.metadata?.test ??
      activeDiff.baseScreenshot?.metadata?.test ??
      null;
    const branch =
      prMerged || test === activeDiff.baseScreenshot?.metadata?.test
        ? baseBranch
        : compareBranch;
    const playwrightTraceUrl =
      activeDiff.compareScreenshot?.playwrightTraceUrl ?? null;
    return (
      <div
        className={clsx(
          "sticky top-0 z-20 flex shrink-0 items-start justify-between gap-4 border-b p-4 transition-colors",
          !bordered && "border-b-transparent",
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex gap-1 flex-shrink-0">
            <PreviousDiffButton />
            <NextDiffButton />
          </div>
          <div className="flex-1 min-w-0">
            <div role="heading" className="line-clamp-2 text-xs font-medium">
              {activeDiff.name}
            </div>
            <div className="flex flex-wrap gap-1.5 items-center empty:hidden mt-1 min-w-0">
              {sdk && <SdkIndicator sdk={sdk} className="w-4 h-4" />}
              {automationLibrary && (
                <AutomationLibraryIndicator
                  automationLibrary={automationLibrary}
                  className="w-4 h-4"
                />
              )}
              {browser && (
                <BrowserIndicator browser={browser} className="w-4 h-4" />
              )}
              {colorScheme && (
                <ColorSchemeIndicator
                  colorScheme={colorScheme}
                  className="w-4 h-4"
                />
              )}
              {mediaType && (
                <MediaTypeIndicator mediaType={mediaType} className="w-4 h-4" />
              )}
              {viewport && <ViewportIndicator viewport={viewport} />}
              {url && <UrlIndicator url={url} />}
              {test && (
                <TestIndicator test={test} branch={branch} repoUrl={repoUrl} />
              )}
              {playwrightTraceUrl && (
                <TraceIndicator traceUrl={playwrightTraceUrl} />
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <BuildVisibleDiffButtonGroup />
          <BuildSplitViewToggle />
          <BuildDiffFitToggle />
          <BuildDiffChangesOverlayToggle />
        </div>
      </div>
    );
  },
);
