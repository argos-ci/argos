import { memo } from "react";
import { LocateFixedIcon } from "lucide-react";

import { HotkeyTooltip } from "@/ui/HotkeyTooltip";
import { IconButton } from "@/ui/IconButton";
import { useEventCallback } from "@/ui/useEventCallback";

import { useBuildDiffHighlighterContext } from "../BuildDiffHighlighterContext";
import { useBuildHotkey } from "../BuildHotkeys";

export const HighlightButton = memo(() => {
  const { highlighter } = useBuildDiffHighlighterContext();
  const highlight = useEventCallback(() => highlighter?.highlight());
  const enabled = highlighter !== null;
  const hotkey = useBuildHotkey("highlightChanges", highlight, {
    preventDefault: true,
    enabled,
  });
  return (
    <HotkeyTooltip description={hotkey.description} keys={hotkey.displayKeys}>
      <IconButton variant="contained" onPress={highlight} isDisabled={!enabled}>
        <LocateFixedIcon />
      </IconButton>
    </HotkeyTooltip>
  );
});
