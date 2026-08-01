import { memo } from "react";
import { LocateFixedIcon } from "lucide-react";

import { Button } from "@/ui/Button";
import { HotkeyTooltip } from "@/ui/HotkeyTooltip";
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
      <Button
        variant="surface"
        iconOnly
        onPress={highlight}
        isDisabled={!enabled}
      >
        <LocateFixedIcon />
      </Button>
    </HotkeyTooltip>
  );
});
