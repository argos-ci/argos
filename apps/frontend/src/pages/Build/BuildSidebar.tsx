import { memo, startTransition, useCallback, useRef, useState } from "react";
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
import { BuildType } from "@/gql/graphql";
import { HotkeyTooltip } from "@/ui/HotkeyTooltip";
import { IconButton } from "@/ui/IconButton";

import { BuildDiffList } from "./BuildDiffList";
import {
  useMetadataFilterState,
  useSearchModeState,
  useSearchState,
} from "./BuildDiffState";
import { BuildInfos } from "./BuildInfos";
import { BuildParams } from "./BuildParams";
import { FilterButton } from "./metadata/filters/FilterButton";
import { FilterChips } from "./metadata/filters/FilterChips";

function Tab(
  props: TabProps & {
    ref?: React.Ref<HTMLDivElement>;
  },
) {
  return (
    <RACTab
      className={clsx(
        "text-low rac-focus cursor-default rounded-sm px-2 text-sm leading-6 font-medium",
        "data-hovered:bg-ui",
        "data-selected:text-default data-selected:bg-ui",
      )}
      {...props}
    />
  );
}

const _BuildFragment = graphql(`
  fragment BuildSidebar_Build on Build {
    ...BuildInfos_Build
    type
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
        className="text-default placeholder:text-low w-full bg-transparent p-2 pl-6 text-xs leading-6 outline-hidden"
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
  const { tags, selectedFilters, setSelectedFilters } =
    useMetadataFilterState();
  const filterButtonRef = useRef<HTMLButtonElement>(null);
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
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const filterHotKey = useBuildHotkey(
    "toggleFilters",
    () => {
      filterButtonRef.current?.click();
    },
    { enabled: tags.length > 0 },
  );
  return (
    <Tabs
      defaultSelectedKey={!build.stats?.total ? "info" : "screenshots"}
      className="group/sidebar flex w-73.75 shrink-0 flex-col border-r-[0.5px]"
    >
      {build.type !== BuildType.Skipped ? (
        <div className="flex shrink-0 items-center gap-1 border-b px-2">
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
          {tags.length > 0 && (
            <HotkeyTooltip
              keys={filterHotKey.displayKeys}
              description={filterHotKey.description}
              disabled={filterMenuOpen}
            >
              <FilterButton
                ref={filterButtonRef}
                tags={tags}
                selectedFilters={selectedFilters}
                setSelectedFilters={setSelectedFilters}
                onOpenChange={setFilterMenuOpen}
              />
            </HotkeyTooltip>
          )}
        </div>
      ) : null}

      {searchMode ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <FilterChips />
          <BuildDiffList />
        </div>
      ) : (
        <>
          {build.type !== BuildType.Skipped ? (
            <TabPanel id="screenshots" className="flex min-h-0 flex-1 flex-col">
              <FilterChips />
              <BuildDiffList />
            </TabPanel>
          ) : null}

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
