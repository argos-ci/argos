import { memo, startTransition } from "react";
import { useAtom } from "jotai/react";
import { ColumnsIcon, GalleryHorizontalIcon } from "lucide-react";

import { Button } from "@/ui/Button";
import { ButtonGroup } from "@/ui/ButtonGroup";
import { HotkeyTooltip } from "@/ui/HotkeyTooltip";

import { Hotkey, useBuildHotkey } from "../BuildHotkeys";
import { buildViewModeAtom, type ViewMode } from "../BuildViewMode";
import { useZoomerSyncContext } from "../Zoomer";

export const ViewToggle = memo((props: { blendEnabled: boolean }) => {
  const { blendEnabled } = props;
  const [viewMode, setViewMode] = useAtom(buildViewModeAtom);
  const showBaselineHotkey = useBuildHotkey(
    "showBaseline",
    () => {
      startTransition(() => {
        setViewMode("baseline");
      });
    },
    { preventDefault: true },
  );
  const showChangesHotkey = useBuildHotkey(
    "showChanges",
    () => {
      startTransition(() => {
        setViewMode("changes");
      });
    },
    { preventDefault: true },
  );
  const showOnionHotkey = useBuildHotkey(
    "showOnion",
    () => {
      startTransition(() => {
        setViewMode("onion");
      });
    },
    { preventDefault: true, enabled: blendEnabled },
  );
  const showSwipeHotkey = useBuildHotkey(
    "showSwipe",
    () => {
      startTransition(() => {
        setViewMode("swipe");
      });
    },
    { preventDefault: true, enabled: blendEnabled },
  );

  if (viewMode === "split") {
    return null;
  }

  return (
    <ButtonGroup>
      <ViewButton viewMode="baseline" hotkey={showBaselineHotkey}>
        Baseline
      </ViewButton>
      <ViewButton viewMode="changes" hotkey={showChangesHotkey}>
        Changes
      </ViewButton>
      {blendEnabled && (
        <>
          <ViewButton viewMode="onion" hotkey={showOnionHotkey}>
            Onion
          </ViewButton>
          <ViewButton viewMode="swipe" hotkey={showSwipeHotkey}>
            Swipe
          </ViewButton>
        </>
      )}
    </ButtonGroup>
  );
});

function ViewButton(props: {
  viewMode: Exclude<ViewMode, "split">;
  hotkey: Hotkey;
  children: React.ReactNode;
}) {
  const [viewMode, setViewMode] = useAtom(buildViewModeAtom);
  const activate = () => {
    startTransition(() => {
      setViewMode(props.viewMode);
    });
  };
  return (
    <HotkeyTooltip
      description={props.hotkey.description}
      keys={props.hotkey.displayKeys}
      keysEnabled={viewMode !== props.viewMode}
    >
      <Button
        variant="secondary"
        aria-pressed={viewMode === props.viewMode}
        onPress={activate}
      >
        {props.children}
      </Button>
    </HotkeyTooltip>
  );
}

export const SplitViewToggle = memo(() => {
  const [viewMode, setViewMode] = useAtom(buildViewModeAtom);
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
          ? "Show only one image at a time"
          : "Show baseline and changes side by side"
      }
      keys={hotkey.displayKeys}
    >
      {/* Two panes or one: the icon is the state, so there is no pressed
          state on top of it. */}
      <Button variant="secondary" iconOnly onPress={toggleSplitView}>
        {viewMode === "split" ? <GalleryHorizontalIcon /> : <ColumnsIcon />}
      </Button>
    </HotkeyTooltip>
  );
});
