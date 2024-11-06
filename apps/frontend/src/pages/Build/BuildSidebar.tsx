import * as React from "react";
import clsx from "clsx";
import { SearchIcon, XIcon } from "lucide-react";
import {
  Tab as RACTab,
  TabList as RACTabList,
  TabPanel,
  TabProps,
  Tabs,
} from "react-aria-components";

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
      className={clsx(
        "text-low rac-focus cursor-default rounded px-2 text-sm font-medium leading-6",
        "data-[hovered]:bg-ui",
        "data-[selected]:text data-[selected]:bg-ui",
      )}
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
      <div className="relative flex-1">
        <SearchIcon className="text-low pointer-events-none absolute my-3 size-4" />
        <input
          ref={ref}
          type="text"
          autoFocus
          placeholder="Find..."
          className="text placeholder:text-low w-full bg-transparent p-2 pl-6 text-xs leading-6 outline-none"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
            }
          }}
        />
      </div>
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
        defaultSelectedKey={build.stats.total === 0 ? "info" : "screenshots"}
        className="group/sidebar flex w-[295px] shrink-0 flex-col border-r"
      >
        <div className="flex shrink-0 items-center border-b px-2">
          {searchMode ? (
            <>
              <SearchInput ref={searchInputRef} />
              <HotkeyTooltip
                keys={leaveSearchModeHotKey.displayKeys}
                description="Exit search mode"
              >
                <IconButton size="small" onPress={() => setSearchMode(false)}>
                  <XIcon />
                </IconButton>
              </HotkeyTooltip>
            </>
          ) : (
            <>
              <RACTabList
                className="flex flex-1 shrink-0 gap-2 py-2"
                aria-label="Build details"
              >
                <Tab id="screenshots">Screenshots</Tab>
                <Tab id="info">Info</Tab>
              </RACTabList>
              <HotkeyTooltip
                keys={searchModeHotKey.displayKeys}
                description="Find"
              >
                <IconButton
                  onPress={() => enterSearchMode()}
                  aria-pressed={searchMode}
                  size="small"
                >
                  <SearchIcon />
                </IconButton>
              </HotkeyTooltip>
            </>
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
