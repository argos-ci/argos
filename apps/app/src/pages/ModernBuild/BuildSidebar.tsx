import {
  Tab as AriakitTab,
  TabList,
  TabPanel,
  TabProps,
  useTabState,
} from "ariakit/tab";
import { BuildInfos, BuildInfosProps } from "./BuildInfos";
import { BuildDiffList } from "./BuildDiffList";
import { memo } from "react";

const Tab = (props: TabProps) => {
  return (
    <AriakitTab
      className="cursor-default px-2 text-sm font-medium leading-10 text-tab-on transition hover:text-tab-hover-on aria-selected:text-tab-selected-on"
      {...props}
    />
  );
};

export type BuildSidebarProps = BuildInfosProps;

export const BuildSidebar = memo(
  ({ build, githubRepoUrl }: BuildSidebarProps) => {
    const tab = useTabState();
    return (
      <div className="group/sidebar flex w-[295px] flex-shrink-0 flex-col border-r border-r-border">
        <TabList
          state={tab}
          aria-label="Build details"
          className="flex flex-shrink-0 border-b border-b-border px-2"
        >
          <Tab state={tab}>Screenshots</Tab>
          <Tab state={tab}>Info</Tab>
        </TabList>

        <TabPanel
          state={tab}
          tabIndex={-1}
          className="flex min-h-0 flex-1 flex-col"
        >
          <BuildDiffList />
        </TabPanel>

        <TabPanel state={tab} className="flex-1 p-4">
          <BuildInfos build={build} githubRepoUrl={githubRepoUrl} />
        </TabPanel>
      </div>
    );
  }
);
