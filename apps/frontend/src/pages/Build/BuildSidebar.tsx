import * as React from "react";
import { SearchIcon, XIcon } from "lucide-react";
import {
  Tab as RACTab,
  TabList as RACTabList,
  TabPanel,
  TabProps,
  Tabs,
} from "react-aria-components";

import { checkIsBuildEmpty } from "@/containers/Build";
import { FragmentType, graphql, useFragment } from "@/gql";
import { HotkeyTooltip } from "@/ui/HotkeyTooltip";
import { IconButton } from "@/ui/IconButton";

import { BuildDiffList } from "./BuildDiffList";
import { useSearchModeState, useSearchState } from "./BuildDiffState";
import { useBuildHotkey } from "./BuildHotkeys";
import { BuildInfos } from "./BuildInfos";
import { BuildParams } from "./BuildParams";

const Tab = React.forwardRef(function Tab(
  props: TabProps,
  ref: React.ForwardedRef<HTMLDivElement>,
) {
  return (
    <RACTab
      ref={ref}
      className="text-low data-[hovered]:text data-[selected]:text rac-focus cursor-default px-2 text-sm font-medium leading-10 transition"
      {...props}
    />
  );
});

const BuildFragment = graphql(`
  fragment BuildSidebar_Build on Build {
    ...BuildInfos_Build
    stats {
      total
    }
  }
`);

const SearchInput = React.forwardRef<HTMLInputElement, object>(
  (_props, ref) => {
    const { search, setSearch } = useSearchState();
    return (
      <input
        ref={ref}
        type="text"
        autoFocus
        placeholder="Find..."
        className="text placeholder:text-low flex-1 bg-transparent p-2 text-xs leading-6 outline-none"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
          }
        }}
      />
    );
  },
);

export const BuildSidebar = React.memo(
  (props: {
    repoUrl: string | null;
    build: FragmentType<typeof BuildFragment>;
    params: BuildParams;
  }) => {
    const build = useFragment(BuildFragment, props.build);
    const { searchMode, setSearchMode } = useSearchModeState();
    const searchInputRef = React.useRef<HTMLInputElement>(null);
    const enterSearchMode = React.useCallback(() => {
      setSearchMode(true);
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    }, [setSearchMode]);
    const leaveSearchModeHotKey = useBuildHotkey(
      "leaveSearchMode",
      () => {
        setSearchMode(false);
      },
      {
        allowInInput: true,
      },
    );
    const searchModeHotKey = useBuildHotkey(
      "enterSearchMode",
      enterSearchMode,
      {
        allowInInput: true,
      },
    );
    return (
      <Tabs
        defaultSelectedKey={
          build && checkIsBuildEmpty(build) ? "info" : "screenshots"
        }
        className="group/sidebar flex w-[295px] shrink-0 flex-col border-r"
      >
        <div className="flex shrink-0 items-center border-b px-2">
          <HotkeyTooltip
            keys={searchModeHotKey.displayKeys}
            description="Find..."
          >
            <IconButton
              onPress={() => enterSearchMode()}
              aria-pressed={searchMode}
            >
              <SearchIcon />
            </IconButton>
          </HotkeyTooltip>
          {searchMode ? (
            <>
              <SearchInput ref={searchInputRef} />
              <HotkeyTooltip
                keys={leaveSearchModeHotKey.displayKeys}
                description="Exit search mode"
              >
                <IconButton onPress={() => setSearchMode(false)}>
                  <XIcon />
                </IconButton>
              </HotkeyTooltip>
            </>
          ) : (
            <RACTabList className="flex shrink-0" aria-label="Build details">
              <Tab id="screenshots">Screenshots</Tab>
              <Tab id="info">Info</Tab>
            </RACTabList>
          )}
        </div>

        {searchMode ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <BuildDiffList />
          </div>
        ) : (
          <>
            <TabPanel id="screenshots" className="flex min-h-0 flex-1 flex-col">
              <BuildDiffList />
            </TabPanel>

            <TabPanel id="info" className="flex-1 overflow-auto p-4">
              <BuildInfos
                build={build}
                repoUrl={props.repoUrl}
                params={props.params}
              />
            </TabPanel>
          </>
        )}
      </Tabs>
    );
  },
);
