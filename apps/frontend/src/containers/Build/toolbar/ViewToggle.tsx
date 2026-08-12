import { memo, startTransition } from "react";
import { useAtom } from "jotai/react";

import { Button } from "@/ui/Button";
import { ButtonGroup } from "@/ui/ButtonGroup";
import { HotkeyTooltip } from "@/ui/HotkeyTooltip";
import {
  BaselineViewIcon,
  ChangesViewIcon,
  OnionViewIcon,
  SplitViewIcon,
  SwipeViewIcon,
} from "@/ui/Icons";
import { useEventCallback } from "@/ui/useEventCallback";

import { Hotkey, useBuildHotkey } from "../BuildHotkeys";
import { buildViewModeAtom, type ViewMode } from "../BuildViewMode";
import { useZoomerSyncContext } from "../Zoomer";

/**
 * What the two sides of the comparison are called. A build compares a baseline
 * against its changes; a media pair compares a "before" against an "after" —
 * the same two things under different names.
 */
type ViewToggleLabels = { baseline: string; changes: string };

const DEFAULT_LABELS: ViewToggleLabels = {
  baseline: "Baseline",
  changes: "Changes",
};

/**
 * Every way of looking at the comparison, in one control: one side alone, both
 * sides apart, or both sides merged. Reading left to right, the two sides come
 * together — which is also why side by side sits in the middle rather than
 * beside the group as its own button.
 *
 * Icons rather than words because five words do not fit a toolbar that also
 * carries the overlay, comment and fit controls, and because the drawings say
 * what the words could not: which side is being held back.
 */
export const ViewToggle = memo(
  (props: { blendEnabled: boolean; labels?: ViewToggleLabels }) => {
    const { blendEnabled, labels = DEFAULT_LABELS } = props;
    const [viewMode, setViewMode] = useAtom(buildViewModeAtom);
    const { reset } = useZoomerSyncContext();

    const select = useEventCallback((next: ViewMode) => {
      // Entering or leaving side by side changes how many panes the zoom is
      // spread over, so the shared transform no longer means anything. Every
      // other switch keeps one pane and keeps the reviewer where they were —
      // resetting there would throw away the spot they are looking at.
      if ((viewMode === "split") !== (next === "split")) {
        reset();
      }
      startTransition(() => {
        setViewMode(next);
      });
    });

    const showBaselineHotkey = useBuildHotkey(
      "showBaseline",
      () => {
        select("baseline");
      },
      { preventDefault: true },
    );
    const showChangesHotkey = useBuildHotkey(
      "showChanges",
      () => {
        select("changes");
      },
      { preventDefault: true },
    );
    // The key stays a toggle even though the button is a plain selection: it is
    // the way back out of side by side, and there is no second key for that.
    const toggleSplitViewHotkey = useBuildHotkey(
      "toggleSplitView",
      () => {
        select(viewMode === "split" ? "changes" : "split");
      },
      { preventDefault: true },
    );
    const showOnionHotkey = useBuildHotkey(
      "showOnion",
      () => {
        select("onion");
      },
      { preventDefault: true, enabled: blendEnabled },
    );
    const showSwipeHotkey = useBuildHotkey(
      "showSwipe",
      () => {
        select("swipe");
      },
      { preventDefault: true, enabled: blendEnabled },
    );

    return (
      <ButtonGroup>
        <ViewButton
          viewMode="baseline"
          currentViewMode={viewMode}
          label={labels.baseline}
          hotkey={showBaselineHotkey}
          onSelect={select}
        >
          <BaselineViewIcon />
        </ViewButton>
        <ViewButton
          viewMode="changes"
          currentViewMode={viewMode}
          label={labels.changes}
          hotkey={showChangesHotkey}
          onSelect={select}
        >
          <ChangesViewIcon />
        </ViewButton>
        <ViewButton
          viewMode="split"
          currentViewMode={viewMode}
          label="Side by side"
          hotkey={toggleSplitViewHotkey}
          onSelect={select}
        >
          <SplitViewIcon />
        </ViewButton>
        {blendEnabled && (
          <>
            <ViewButton
              viewMode="onion"
              currentViewMode={viewMode}
              label="Onion skin"
              hotkey={showOnionHotkey}
              onSelect={select}
            >
              <OnionViewIcon />
            </ViewButton>
            <ViewButton
              viewMode="swipe"
              currentViewMode={viewMode}
              label="Swipe"
              hotkey={showSwipeHotkey}
              onSelect={select}
            >
              <SwipeViewIcon />
            </ViewButton>
          </>
        )}
      </ButtonGroup>
    );
  },
);

function ViewButton(props: {
  viewMode: ViewMode;
  currentViewMode: ViewMode;
  /** Names the button, and names it the same way to a screen reader. */
  label: string;
  hotkey: Hotkey;
  onSelect: (viewMode: ViewMode) => void;
  children: React.ReactNode;
}) {
  const { viewMode, currentViewMode, label, hotkey, onSelect, children } =
    props;
  const isCurrent = currentViewMode === viewMode;
  return (
    <HotkeyTooltip
      description={label}
      keys={hotkey.displayKeys}
      keysEnabled={!isCurrent}
    >
      <Button
        variant="secondary"
        iconOnly
        aria-pressed={isCurrent}
        aria-label={label}
        onPress={() => {
          onSelect(viewMode);
        }}
      >
        {children}
      </Button>
    </HotkeyTooltip>
  );
}
