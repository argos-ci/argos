import { memo, startTransition, useCallback, useRef } from "react";
import clsx from "clsx";
import { SearchIcon, XIcon } from "lucide-react";
import {
  Tab as RACTab,
  TabList as RACTabList,
  TabPanel,
  TabProps,
  Tabs,
} from "react-aria-components";

import { useBuildHotkey } from "@/containers/Build/BuildHotkeys";
import { DocumentType, graphql } from "@/gql";
import { HotkeyTooltip } from "@/ui/HotkeyTooltip";
import { IconButton } from "@/ui/IconButton";

import { BuildDiffList } from "./BuildDiffList";
import { useSearchModeState, useSearchState } from "./BuildDiffState";
import { BuildInfos } from "./BuildInfos";
import { BuildParams } from "./BuildParams";

function Tab(
  props: TabProps & {
    ref?: React.Ref<HTMLDivElement>;
  },
) {
  return (
    <RACTab
      className={clsx(
        "text-low rac-focus cursor-default rounded-sm px-2 text-sm font-medium leading-6",
        "data-[hovered]:bg-ui",
        "data-[selected]:text-default data-[selected]:bg-ui",
      )}
      {...props}
    />
  );
}

const _BuildFragment = graphql(`
  fragment BuildSidebar_Build on Build {
    ...BuildInfos_Build
    stats {
      total
    }
  }
`);

function SearchInput({ ref }: { ref: React.Ref<HTMLInputElement> }) {
  const { search, setSearch } = useSearchState();
  return (
    <div className="relative flex-1">
      <SearchIcon className="text-low pointer-events-none absolute my-3 size-4" />
      <input
        ref={ref}
        type="text"
        autoFocus
        placeholder="Find..."
        className="text-default placeholder:text-low outline-hidden w-full bg-transparent p-2 pl-6 text-xs leading-6"
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
}

export const BuildSidebar = memo(function BuildSidebar(props: {
  repoUrl: string | null;
  build: DocumentType<typeof _BuildFragment>;
  params: BuildParams;
}) {
  const { build } = props;
  const { searchMode, setSearchMode } = useSearchModeState();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const enterSearchMode = useCallback(() => {
    startTransition(() => {
      setSearchMode(true);
    });
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
  const searchModeHotKey = useBuildHotkey("enterSearchMode", enterSearchMode, {
    allowInInput: true,
  });
  return (
    <Tabs
      defaultSelectedKey={!build.stats?.total ? "info" : "screenshots"}
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
});
