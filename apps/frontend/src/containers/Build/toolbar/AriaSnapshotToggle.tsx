import { memo, startTransition } from "react";
import { useAtom } from "jotai/react";
import { ScanTextIcon } from "lucide-react";

import { useBuildDiffState } from "@/pages/Build/BuildDiffState";
import { HotkeyTooltip } from "@/ui/HotkeyTooltip";
import { IconButton } from "@/ui/IconButton";

import { useBuildHotkey } from "../BuildHotkeys";
import { snapshotTypeAtom } from "../SnapshotType";

export const AriaSnapshotToggle = memo(() => {
  const { ariaDiff } = useBuildDiffState();
  return ariaDiff ? <Toggle /> : null;
});

function Toggle() {
  const [snapshotType, setSnapshotType] = useAtom(snapshotTypeAtom);
  const toggle = () => {
    startTransition(() => {
      setSnapshotType(
        (prev) =>
          ({ aria: "screenshot" as const, screenshot: "aria" as const })[prev],
      );
    });
  };
  const hotkey = useBuildHotkey("toggleSnapshotType", toggle, {
    preventDefault: true,
  });
  return (
    <HotkeyTooltip
      description={
        {
          screenshot: "Switch to aria view",
          aria: "Switch to screenshot view",
        }[snapshotType]
      }
      keys={hotkey.displayKeys}
    >
      <IconButton aria-pressed={snapshotType === "aria"} onPress={toggle}>
        <ScanTextIcon />
      </IconButton>
    </HotkeyTooltip>
  );
}
