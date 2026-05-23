import { useAtom, useAtomValue } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { PanelRightIcon } from "lucide-react";

import { useBuildHotkey } from "@/containers/Build/BuildHotkeys";
import { graphql } from "@/gql";
import { HotkeyTooltip } from "@/ui/HotkeyTooltip";
import { IconButton } from "@/ui/IconButton";
import { Sidebar } from "@/ui/Sidebar";

import { useBuildDiffState } from "./BuildDiffState";
import {
  MetadataSection,
  type MetadataSectionProps,
} from "./sidebar/MetadataSection";
import { TestActivitySection } from "./sidebar/TestActivitySection";
import { TestChangeSection } from "./sidebar/TestChangeSection";
import { TestInsightsSection } from "./sidebar/TestInsightsSection";

export const rightSidebarOpenAtom = atomWithStorage<boolean>(
  "build.rightSidebar.open",
  false,
);

// Declare fragments
graphql(`
  fragment RightSidebar_Test on Test {
    ...TestChangeSection_Test
    ...TestInsightsSection_Test
    ...TestActivitySection_Test
  }
`);

graphql(`
  fragment RightSidebar_TestChange on TestChange {
    ...TestChangeSection_TestChange
    ...TestActivitySection_TestChange
  }
`);

type Context = Omit<MetadataSectionProps, "diff" | "siblingDiffs">;

export function RightSidebar(props: Context) {
  const open = useAtomValue(rightSidebarOpenAtom);
  const { activeDiff, siblingDiffs } = useBuildDiffState();
  if (!open || !activeDiff) {
    return null;
  }
  return (
    <Sidebar>
      <MetadataSection
        diff={activeDiff}
        siblingDiffs={siblingDiffs}
        {...props}
      />
      {activeDiff.test ? (
        <>
          {activeDiff.change ? (
            <TestChangeSection
              test={activeDiff.test}
              change={activeDiff.change}
              occurrences={activeDiff.last7daysOccurrences}
            />
          ) : null}
          <TestInsightsSection test={activeDiff.test} />
          <TestActivitySection
            test={activeDiff.test}
            change={activeDiff.change ?? null}
          />
        </>
      ) : null}
    </Sidebar>
  );
}

export function RightSidebarToggle() {
  const [open, setOpen] = useAtom(rightSidebarOpenAtom);
  const toggle = () => setOpen((open) => !open);
  const hotkey = useBuildHotkey("showDetails", toggle, {
    preventDefault: true,
  });
  return (
    <HotkeyTooltip
      description={open ? "Hide sidebar" : "Show sidebar"}
      keys={hotkey.displayKeys}
    >
      <IconButton aria-pressed={open} onPress={toggle}>
        <PanelRightIcon />
      </IconButton>
    </HotkeyTooltip>
  );
}
