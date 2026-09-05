import { useEffect } from "react";
import clsx from "clsx";
import { useAtom } from "jotai";
import { PanelRightIcon } from "lucide-react";
import { useLocation } from "react-router";

import { useBuildHotkey } from "@/containers/Build/BuildHotkeys";
import { DocumentType, graphql } from "@/gql";
import { Button } from "@/ui/Button";
import { HotkeyTooltip } from "@/ui/HotkeyTooltip";
import { Sidebar } from "@/ui/Sidebar";
import { PillTab, TabList, TabPanel, Tabs } from "@/ui/Tab";

import { useBuildDiffState } from "./BuildDiffState";
import {
  rightSidebarOpenAtom,
  rightSidebarTabAtom,
  type RightSidebarTab,
} from "./RightSidebarState";
import {
  MetadataSection,
  type MetadataSectionProps,
} from "./sidebar/MetadataSection";
import { ReviewActivitySection } from "./sidebar/ReviewActivitySection";
import { ReviewersSection } from "./sidebar/ReviewersSection";
import { TestActivitySection } from "./sidebar/TestActivitySection";
import { TestChangeSection } from "./sidebar/TestChangeSection";
import { TestInsightsSection } from "./sidebar/TestInsightsSection";

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

type Context = Omit<MetadataSectionProps, "diff" | "siblingDiffs">;

export function RightSidebar(
  props: Context & {
    build: DocumentType<typeof _BuildFragment>;
  },
) {
  const [open, setOpen] = useAtom(rightSidebarOpenAtom);
  const [tab, setTab] = useAtom(rightSidebarTabAtom);
  const { activeDiff, siblingDiffs } = useBuildDiffState();
  const { build, ...context } = props;
  const { hash } = useLocation();
  // Open the sidebar on the Review tab when arriving on a link to a specific comment.
  useEffect(() => {
    if (hash.startsWith("#comment-")) {
      setOpen(true);
      setTab("review");
    }
  }, [hash, setOpen, setTab]);
  if (!open || !activeDiff) {
    return null;
  }
  return (
    <Tabs
      value={tab}
      onValueChange={(key) => setTab(key as RightSidebarTab)}
      className="flex min-h-0 max-w-80 flex-1 flex-col"
    >
      <Sidebar>
        <TabList aria-label="Sidebar" className="flex shrink-0 gap-2 py-2">
          <PillTab value="snapshot">Snapshot</PillTab>
          <PillTab value="review">Review</PillTab>
        </TabList>
        <SidebarTabPanel value="snapshot" className="scroll-mask-b-from-95%">
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
              <TestInsightsSection test={activeDiff.test} diff={activeDiff} />
              <TestActivitySection
                test={activeDiff.test}
                change={activeDiff.change ?? null}
              />
            </>
          ) : null}
        </SidebarTabPanel>
        <SidebarTabPanel value="review">
          <ReviewersSection build={build} />
          <ReviewActivitySection build={build} />
        </SidebarTabPanel>
      </Sidebar>
    </Tabs>
  );
}

function SidebarTabPanel(props: React.ComponentProps<typeof TabPanel>) {
  return (
    <TabPanel
      {...props}
      // Top edge here, and the bottom left to the caller: the review panel ends
      // in a comment composer, and fading the field someone is typing into is
      // worse than leaving its cut-off edge to say there is more below.
      className={clsx(
        "scroll-mask-t-from-95% flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-2 pb-6 empty:hidden",
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
      <Button variant="secondary" iconOnly aria-pressed={open} onClick={toggle}>
        <PanelRightIcon />
      </Button>
    </HotkeyTooltip>
  );
}
