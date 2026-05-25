import clsx from "clsx";
import { useAtom, useAtomValue } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { PanelRightIcon } from "lucide-react";
import {
  Tab as RACTab,
  TabList as RACTabList,
  TabPanel,
  TabProps,
  Tabs,
  type TabPanelProps,
} from "react-aria-components";

import { useBuildHotkey } from "@/containers/Build/BuildHotkeys";
import { DocumentType, graphql } from "@/gql";
import { HotkeyTooltip } from "@/ui/HotkeyTooltip";
import { IconButton } from "@/ui/IconButton";

import { useBuildDiffState } from "./BuildDiffState";
import {
  MetadataSection,
  type MetadataSectionProps,
} from "./sidebar/MetadataSection";
import { ReviewActivitySection } from "./sidebar/ReviewActivitySection";
import { ReviewersSection } from "./sidebar/ReviewersSection";
import { TestActivitySection } from "./sidebar/TestActivitySection";
import { TestChangeSection } from "./sidebar/TestChangeSection";
import { TestInsightsSection } from "./sidebar/TestInsightsSection";

export const rightSidebarOpenAtom = atomWithStorage<boolean>(
  "build.rightSidebar.open",
  true,
);

type RightSidebarTab = "snapshot" | "review";

const rightSidebarTabAtom = atomWithStorage<RightSidebarTab>(
  "build.rightSidebar.tab",
  "snapshot",
);

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

const _BuildFragment = graphql(`
  fragment RightSidebar_Build on Build {
    ...ReviewersSection_Build
    ...ReviewActivitySection_Build
  }
`);

function PillTab(
  props: TabProps & {
    ref?: React.Ref<HTMLDivElement>;
  },
) {
  return (
    <RACTab
      {...props}
      className={clsx(
        "border-thin text-low rac-focus cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition",
        "data-hovered:text-default data-hovered:bg-hover",
        "data-selected:bg-active data-selected:text-default data-selected:cursor-default",
      )}
    />
  );
}

type Context = Omit<MetadataSectionProps, "diff" | "siblingDiffs">;

export function RightSidebar(
  props: Context & {
    build: DocumentType<typeof _BuildFragment>;
  },
) {
  const open = useAtomValue(rightSidebarOpenAtom);
  const [tab, setTab] = useAtom(rightSidebarTabAtom);
  const { activeDiff, siblingDiffs } = useBuildDiffState();
  const { build, ...context } = props;
  if (!open || !activeDiff) {
    return null;
  }
  return (
    <Tabs
      selectedKey={tab}
      onSelectionChange={(key) => setTab(key as RightSidebarTab)}
      className="flex min-h-0 max-w-80 flex-1 flex-col"
    >
      <RACTabList aria-label="Sidebar" className="flex shrink-0 gap-2 py-2">
        <PillTab id="snapshot">Snapshot</PillTab>
        <PillTab id="review">Review</PillTab>
      </RACTabList>
      <SidebarTabPanel id="snapshot">
        <MetadataSection
          diff={activeDiff}
          siblingDiffs={siblingDiffs}
          {...context}
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
      </SidebarTabPanel>
      <SidebarTabPanel id="review">
        <ReviewersSection build={build} />
        <ReviewActivitySection build={build} />
      </SidebarTabPanel>
    </Tabs>
  );
}

function SidebarTabPanel(props: TabPanelProps) {
  return (
    <TabPanel
      {...props}
      className={clsx(
        "flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-2 pb-4 empty:hidden",
        props.className,
      )}
    />
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
