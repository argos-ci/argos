import { memo } from "react";

import { ChevronLeftIcon, ChevronRightIcon } from "@/ui/argos-icons";
import { Button } from "@/ui/Button";
import { HotkeyTooltip } from "@/ui/HotkeyTooltip";
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
  const Icon = direction === -1 ? ChevronLeftIcon : ChevronRightIcon;
  return (
    <HotkeyTooltip description={hotkey.description} keys={hotkey.displayKeys}>
      <Button variant="secondary" iconOnly onClick={go} disabled={!enabled}>
        <Icon />
      </Button>
    </HotkeyTooltip>
  );
}

export const GoToNextChangesButton = memo(() => {
  return <GoToChangesButton direction={1} />;
});

export const GoToPreviousChangesButton = memo(() => {
  return <GoToChangesButton direction={-1} />;
});
