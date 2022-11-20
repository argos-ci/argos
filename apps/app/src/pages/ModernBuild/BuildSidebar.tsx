import {
  Tab as AriakitTab,
  TabList,
  TabPanel,
  TabProps,
  useTabState,
} from "ariakit/tab";
import { BuildInfos, BuildInfosProps } from "./BuildInfos";
import { BuildDiffList } from "./BuildDiffList";
import { forwardRef, memo } from "react";
import { useBuildHotkey } from "./BuildHotkeys";
import { HotkeyTooltip } from "@/modern/ui/HotkeyTooltip";

const Tab = forwardRef<HTMLButtonElement, TabProps>((props, ref) => {
  return (
    <AriakitTab
      ref={ref}
      className="cursor-default px-2 text-sm font-medium leading-10 text-tab-on transition hover:text-tab-hover-on aria-selected:text-tab-selected-on"
      {...props}
    />
  );
});

export type BuildSidebarProps = BuildInfosProps;

export const BuildSidebar = memo(
  ({ build, githubRepoUrl }: BuildSidebarProps) => {
    const tab = useTabState({
      defaultSelectedId: "screenshots",
    });
    const hotkey = useBuildHotkey(
      "toggleSidebarPanel",
      () => {
        tab.setSelectedId(tab.next());
      },
      { preventDefault: true }
    );
    return (
      <div className="group/sidebar flex w-[295px] flex-shrink-0 flex-col border-r border-r-border">
        <TabList
          state={tab}
          aria-label="Build details"
          className="flex flex-shrink-0 border-b border-b-border px-2"
        >
          <HotkeyTooltip
            keys={hotkey.displayKeys}
            description="Screenshots"
            keysEnabled={tab.selectedId !== "screenshots"}
          >
            <Tab id="screenshots" state={tab}>
              Screenshots
            </Tab>
          </HotkeyTooltip>
          <HotkeyTooltip
            keys={hotkey.displayKeys}
            description="Info"
            keysEnabled={tab.selectedId !== "info"}
          >
            <Tab id="info" state={tab}>
              Info
            </Tab>
          </HotkeyTooltip>
        </TabList>

        <TabPanel
          state={tab}
          tabId="screenshots"
          tabIndex={-1}
          className="flex min-h-0 flex-1 flex-col"
        >
          <BuildDiffList />
        </TabPanel>

        <TabPanel state={tab} tabId="info" className="flex-1 p-4">
          <BuildInfos build={build} githubRepoUrl={githubRepoUrl} />
        </TabPanel>
      </div>
    );
  }
);
