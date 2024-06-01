import { memo } from "react";
import { ColumnsIcon } from "lucide-react";

import { ButtonGroup } from "@/ui/ButtonGroup";
import { HotkeyTooltip } from "@/ui/HotkeyTooltip";
import { IconButton } from "@/ui/IconButton";

import { Hotkey, useBuildHotkey } from "../BuildHotkeys";
import { useBuildDiffViewModeState } from "../useBuildDiffViewModeState";
import { useZoomerSyncContext } from "../Zoomer";

export const ViewToggle = memo(() => {
  const { setViewMode, viewMode } = useBuildDiffViewModeState();
  const showBaselineHotkey = useBuildHotkey(
    "showBaseline",
    () => {
      setViewMode("baseline");
    },
    { preventDefault: true },
  );
  const showChangesHotkey = useBuildHotkey(
    "showChanges",
    () => {
      setViewMode("changes");
    },
    { preventDefault: true },
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
    </ButtonGroup>
  );
});

function ViewButton(props: {
  viewMode: "baseline" | "changes";
  hotkey: Hotkey;
  children: React.ReactNode;
}) {
  const { setViewMode, viewMode } = useBuildDiffViewModeState();
  const activate = () => {
    setViewMode(props.viewMode);
  };
  return (
    <HotkeyTooltip
      description={props.hotkey.description}
      keys={props.hotkey.displayKeys}
      keysEnabled={viewMode !== props.viewMode}
    >
      <IconButton aria-pressed={viewMode === props.viewMode} onPress={activate}>
        {props.children}
      </IconButton>
    </HotkeyTooltip>
  );
}

export const SplitViewToggle = memo(() => {
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
          ? "Show only one image at a time"
          : "Show baseline and changes side by side"
      }
      keys={hotkey.displayKeys}
    >
      <IconButton aria-pressed={viewMode === "split"} onPress={toggleSplitView}>
        <ColumnsIcon />
      </IconButton>
    </HotkeyTooltip>
  );
});
