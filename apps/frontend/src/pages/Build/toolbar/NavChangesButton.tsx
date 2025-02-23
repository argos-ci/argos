import { memo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { HotkeyTooltip } from "@/ui/HotkeyTooltip";
import { IconButton } from "@/ui/IconButton";
import { useEventCallback } from "@/ui/useEventCallback";

import { useBuildDiffHighlighterContext } from "../BuildDiffHighlighterContext";
import { useBuildHotkey } from "../BuildHotkeys";

function GoToChangesButton(props: { direction: -1 | 1 }) {
  const { direction } = props;
  const { highlighter } = useBuildDiffHighlighterContext();
  const go = useEventCallback(() => highlighter?.go(direction));
  const enabled = highlighter !== null;
  const hotkey = useBuildHotkey(
    direction === -1 ? "goToPreviousChanges" : "goToNextChanges",
    go,
    {
      preventDefault: true,
      enabled,
    },
  );
  const Icon = direction === -1 ? ChevronLeft : ChevronRight;
  return (
    <HotkeyTooltip description={hotkey.description} keys={hotkey.displayKeys}>
      <IconButton variant="contained" onPress={go} isDisabled={!enabled}>
        <Icon />
      </IconButton>
    </HotkeyTooltip>
  );
}

export const GoToNextChangesButton = memo(() => {
  return <GoToChangesButton direction={1} />;
});

export const GoToPreviousChangesButton = memo(() => {
  return <GoToChangesButton direction={-1} />;
});
