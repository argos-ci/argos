import { memo, startTransition } from "react";
import { useAtom } from "jotai/react";
import { ImageIcon, ScanTextIcon } from "lucide-react";

import { useBuildDiffState } from "@/pages/Build/BuildDiffState";
import { Button } from "@/ui/Button";
import { ButtonGroup } from "@/ui/ButtonGroup";
import { HotkeyTooltip } from "@/ui/HotkeyTooltip";
import { Tooltip } from "@/ui/Tooltip";

import { useBuildHotkey } from "../BuildHotkeys";
import { snapshotTypeAtom } from "../SnapshotType";

export const AriaSnapshotToggle = memo(() => {
  const { ariaDiff } = useBuildDiffState();
  return ariaDiff ? <Toggle /> : null;
});

/**
 * Which of the two recordings of the page is on screen: the pixels, or the
 * accessibility tree the same capture wrote next to them.
 *
 * A pair of buttons rather than one that swaps its icon: both are always
 * available, so showing both — with the current one pressed — says what is on
 * screen as well as what else there is.
 */
function Toggle() {
  const [snapshotType, setSnapshotType] = useAtom(snapshotTypeAtom);
  const select = (type: "screenshot" | "aria") => {
    startTransition(() => {
      setSnapshotType(type);
    });
  };
  const hotkey = useBuildHotkey(
    "toggleSnapshotType",
    () => select(snapshotType === "aria" ? "screenshot" : "aria"),
    { preventDefault: true },
  );
  return (
    <ButtonGroup role="group" aria-label="Snapshot type">
      <Tooltip content="Screenshot">
        <Button
          variant="secondary"
          iconOnly
          aria-pressed={snapshotType === "screenshot"}
          aria-label="Screenshot"
          onPress={() => select("screenshot")}
        >
          <ImageIcon />
        </Button>
      </Tooltip>
      <HotkeyTooltip
        description="Accessibility tree"
        keys={hotkey.displayKeys}
        keysEnabled={snapshotType !== "aria"}
      >
        <Button
          variant="secondary"
          iconOnly
          aria-pressed={snapshotType === "aria"}
          aria-label="Accessibility tree"
          onPress={() => select("aria")}
        >
          <ScanTextIcon />
        </Button>
      </HotkeyTooltip>
    </ButtonGroup>
  );
}
