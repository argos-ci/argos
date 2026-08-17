import { memo, startTransition } from "react";
import { useAtom } from "jotai/react";
import { ImageIcon, ScanTextIcon } from "lucide-react";

import { useBuildDiffState } from "@/pages/Build/BuildDiffState";
import { Button } from "@/ui/Button";
import { HotkeyTooltip } from "@/ui/HotkeyTooltip";

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
      {/* The icon is the destination, not the state: the aria tree while looking
          at the screenshot, the screenshot while reading the tree. */}
      <Button variant="secondary" iconOnly onClick={toggle}>
        {snapshotType === "aria" ? <ImageIcon /> : <ScanTextIcon />}
      </Button>
    </HotkeyTooltip>
  );
}
