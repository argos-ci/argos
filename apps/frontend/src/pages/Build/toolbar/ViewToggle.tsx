import { memo } from "react";
import { ColumnsIcon } from "lucide-react";

import { ButtonGroup } from "@/ui/ButtonGroup";
import { HotkeyTooltip } from "@/ui/HotkeyTooltip";
import { IconButton } from "@/ui/IconButton";

import { useBuildHotkey } from "../BuildHotkeys";
import { useBuildDiffViewModeState } from "../useBuildDiffViewModeState";
import { useZoomerSyncContext } from "../Zoomer";

export const ViewToggle = memo(() => {
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
          onPress={toggleBaselineChanges}
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
          onPress={toggleBaselineChanges}
        >
          Changes
        </IconButton>
      </HotkeyTooltip>
    </ButtonGroup>
  );
});

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
