import {
  Tab as AriakitTab,
  TabList,
  TabPanel,
  TabProps,
  useTabState,
} from "ariakit/tab";
import * as React from "react";

import { checkIsBuildEmpty } from "@/containers/Build";
import { FragmentType, graphql, useFragment } from "@/gql";
import { HotkeyTooltip } from "@/ui/HotkeyTooltip";

import { BuildDiffList } from "./BuildDiffList";
import { useBuildHotkey } from "./BuildHotkeys";
import { BuildInfos } from "./BuildInfos";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { IconButton } from "@/ui/IconButton";
import { useSearchModeState, useSearchState } from "./BuildDiffState";

const Tab = React.forwardRef<HTMLButtonElement, TabProps>((props, ref) => {
  return (
    <AriakitTab
      ref={ref}
      className="cursor-default px-2 text-sm font-medium leading-10 text-low transition hover:text aria-selected:text"
      {...props}
    />
  );
});

export const BuildFragment = graphql(`
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
        className="flex-1 text text-xs leading-6 py-2 px-2 outline-none placeholder:text-low bg-transparent"
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
    githubRepoUrl: string | null;
    build: FragmentType<typeof BuildFragment>;
  }) => {
    const build = useFragment(BuildFragment, props.build);
    const tab = useTabState({
      defaultSelectedId:
        build && checkIsBuildEmpty(build) ? "info" : "screenshots",
    });
    const hotkey = useBuildHotkey(
      "toggleSidebarPanel",
      () => {
        tab.setSelectedId(tab.next());
      },
      { preventDefault: true },
    );
    const { searchMode, setSearchMode } = useSearchModeState();
    const searchInputRef = React.useRef<HTMLInputElement>(null);
    const enterSearchMode = React.useCallback(() => {
      setSearchMode(true);
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    }, [setSearchMode]);
    useBuildHotkey(
      "leaveSearchMode",
      () => {
        setSearchMode(false);
      },
      {
        allowInInput: true,
      },
    );
    useBuildHotkey("enterSearchMode", enterSearchMode, {
      allowInInput: true,
    });
    return (
      <div className="group/sidebar flex w-[295px] shrink-0 flex-col border-r">
        <div className="flex shrink-0 px-2 border-b items-center">
          <IconButton
            onClick={() => enterSearchMode()}
            aria-pressed={searchMode}
          >
            <MagnifyingGlassIcon />
          </IconButton>
          {searchMode ? (
            <>
              <SearchInput ref={searchInputRef} />
              <IconButton onClick={() => setSearchMode(false)}>
                <XMarkIcon />
              </IconButton>
            </>
          ) : (
            <TabList
              state={tab}
              aria-label="Build details"
              className="flex shrink-0"
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
          )}
        </div>

        {searchMode ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <BuildDiffList />
          </div>
        ) : (
          <>
            <TabPanel
              state={tab}
              tabId="screenshots"
              focusable={false}
              className="flex min-h-0 flex-1 flex-col"
            >
              <BuildDiffList />
            </TabPanel>

            <TabPanel
              state={tab}
              tabId="info"
              className="flex-1 p-4"
              focusable={false}
            >
              <BuildInfos build={build} githubRepoUrl={props.githubRepoUrl} />
            </TabPanel>
          </>
        )}
      </div>
    );
  },
);
