import * as React from "react";
import {
  Tab as AriakitTab,
  TabList,
  TabPanel,
  TabProps,
  useTabState,
} from "ariakit/tab";
import { SearchIcon, XIcon } from "lucide-react";

import { checkIsBuildEmpty } from "@/containers/Build";
import { FragmentType, graphql, useFragment } from "@/gql";
import { HotkeyTooltip } from "@/ui/HotkeyTooltip";
import { IconButton } from "@/ui/IconButton";

import { BuildDiffList } from "./BuildDiffList";
import { useSearchModeState, useSearchState } from "./BuildDiffState";
import { useBuildHotkey } from "./BuildHotkeys";
import { BuildInfos } from "./BuildInfos";

const Tab = React.forwardRef<HTMLButtonElement, TabProps>((props, ref) => {
  return (
    <AriakitTab
      ref={ref}
      className="text-low hover:text aria-selected:text cursor-default px-2 text-sm font-medium leading-10 transition"
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
      <div className="group/sidebar flex w-[295px] shrink-0 flex-col border-r">
        <div className="flex shrink-0 items-center border-b px-2">
          <HotkeyTooltip
            keys={searchModeHotKey.displayKeys}
            description="Find..."
          >
            <IconButton
              onClick={() => enterSearchMode()}
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
                <IconButton onClick={() => setSearchMode(false)}>
                  <XIcon />
                </IconButton>
              </HotkeyTooltip>
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
              <BuildInfos build={build} repoUrl={props.repoUrl} />
            </TabPanel>
          </>
        )}
      </div>
    );
  },
);
